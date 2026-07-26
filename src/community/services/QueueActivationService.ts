import {
  MessageFlags,
  type Guild,
  type GuildMember,
  type Role,
} from "discord.js";

import { GuildBlueprint } from "../../config/guildBlueprint.js";
import { logger } from "../../config/logger.js";
import {
  QueueActivationConfig,
} from "../../constants/queueActivation.js";
import { MatchmakingConfig } from "../../domain/matchmaking/MatchmakingConfig.js";
import type { QueueActivationRepository } from "../../repositories/QueueActivationRepository.js";
import type {
  QueueActivationMetrics,
  QueueSessionSummary,
} from "../../types/queueActivation.js";
import {
  createQueueNeedPlayersView,
  createQueueSessionReminderView,
} from "../ui/createQueueActivationView.js";
import { QueueActivationError } from "../errors/QueueActivationError.js";
import type { ManagedCommunityChannelResolver } from "./ManagedCommunityChannelResolver.js";

export class QueueActivationService {
  public constructor(
    private readonly repository: QueueActivationRepository,
    private readonly channels: ManagedCommunityChannelResolver,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async toggleAlerts(
    guild: Guild,
    member: GuildMember,
  ): Promise<"enabled" | "disabled"> {
    const role = await this.resolveAlertRole(guild);

    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role, "Member disabled voluntary Squad Alerts");
      return "disabled";
    }

    await member.roles.add(role, "Member enabled voluntary Squad Alerts");
    return "enabled";
  }

  public async getUpcomingSessions(
    guildId: string,
  ): Promise<QueueSessionSummary[]> {
    return this.repository.findUpcomingSessions(
      guildId,
      this.now(),
      QueueActivationConfig.maximumUpcomingSessions,
    );
  }

  public async scheduleSession(input: {
    guildId: string;
    title?: string;
    startsInMinutes: number;
    durationMinutes?: number;
    createdByDiscordId: string;
  }): Promise<QueueSessionSummary> {
    const title =
      input.title?.trim().replace(/\s+/g, " ") || "Community Queue Session";
    const durationMinutes =
      input.durationMinutes ??
      QueueActivationConfig.defaultSessionDurationMinutes;

    if (
      input.startsInMinutes <
        QueueActivationConfig.minimumSessionLeadMinutes ||
      input.startsInMinutes >
        QueueActivationConfig.maximumSessionLeadMinutes
    ) {
      throw new QueueActivationError(
        `Schedule the session between ${QueueActivationConfig.minimumSessionLeadMinutes} minutes and 7 days from now.`,
      );
    }

    if (
      durationMinutes <
        QueueActivationConfig.minimumSessionDurationMinutes ||
      durationMinutes >
        QueueActivationConfig.maximumSessionDurationMinutes
    ) {
      throw new QueueActivationError(
        `Session duration must be between ${QueueActivationConfig.minimumSessionDurationMinutes} and ${QueueActivationConfig.maximumSessionDurationMinutes} minutes.`,
      );
    }

    if (title.length < 3 || title.length > 80) {
      throw new QueueActivationError(
        "Session title must contain between 3 and 80 characters.",
      );
    }

    const now = this.now();
    const startsAt = new Date(
      now.getTime() + input.startsInMinutes * 60 * 1_000,
    );
    const endsAt = new Date(
      startsAt.getTime() + durationMinutes * 60 * 1_000,
    );

    return this.repository.createSession({
      guildId: input.guildId,
      title,
      startsAt,
      endsAt,
      createdByDiscordId: input.createdByDiscordId,
    });
  }

  public async cancelSession(
    guildId: string,
    sessionId: string,
    actorDiscordId: string,
  ): Promise<QueueSessionSummary> {
    const session = await this.repository.cancelSession(
      guildId,
      sessionId.trim(),
      actorDiscordId,
      this.now(),
    );

    if (!session) {
      throw new QueueActivationError(
        "That scheduled session was not found or can no longer be cancelled.",
      );
    }

    return session;
  }

  public async getMetrics(guild: Guild): Promise<QueueActivationMetrics> {
    const role = await this.resolveAlertRole(guild);
    const now = this.now();
    const since = new Date(
      now.getTime() -
        QueueActivationConfig.activityWindowDays * 24 * 60 * 60 * 1_000,
    );

    return this.repository.getMetrics(
      guild.id,
      since,
      role.members.size,
      QueueActivationConfig.activityWindowDays,
    );
  }

  public async tick(guild: Guild): Promise<void> {
    const now = this.now();

    await this.notifyDueSessions(guild, now);
    await this.repository.advanceSessions(guild.id, now);
    await this.notifyQueueMilestone(guild, now);
  }

  private async notifyQueueMilestone(guild: Guild, now: Date): Promise<void> {
    const queuedPlayers = await this.repository.getQueuedPlayerCount(guild.id);

    if (
      queuedPlayers === 0 ||
      queuedPlayers >= MatchmakingConfig.playersPerTeam
    ) {
      await this.repository.observeQueue(guild.id, queuedPlayers);
      return;
    }

    const milestone =
      [...QueueActivationConfig.notificationMilestones]
        .reverse()
        .find((candidate) => queuedPlayers >= candidate) ?? 0;
    const state = await this.repository.getQueueState(guild.id);
    const lastNotifiedAt = state?.lastNotifiedAt
      ? new Date(state.lastNotifiedAt)
      : null;
    const cooldownElapsed =
      !lastNotifiedAt ||
      now.getTime() - lastNotifiedAt.getTime() >=
        QueueActivationConfig.notificationCooldownMs;

    if (
      milestone === 0 ||
      milestone <= (state?.lastNotifiedMilestone ?? 0) ||
      !cooldownElapsed
    ) {
      await this.repository.observeQueue(guild.id, queuedPlayers);
      return;
    }

    const [role, channel] = await Promise.all([
      this.resolveAlertRole(guild),
      this.channels.resolveTextChannel(guild, "matchmakingStatus"),
    ]);

    if (!channel || role.members.size === 0) {
      await this.repository.observeQueue(guild.id, queuedPlayers);
      return;
    }

    await channel.send({
      components: [
        createQueueNeedPlayersView(
          role.id,
          queuedPlayers,
          MatchmakingConfig.playersPerTeam,
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { roles: [role.id] },
    });
    await this.repository.recordQueueNotification(
      guild.id,
      queuedPlayers,
      milestone,
      now,
    );
  }

  private async notifyDueSessions(guild: Guild, now: Date): Promise<void> {
    const dueAt = new Date(
      now.getTime() + QueueActivationConfig.sessionReminderLeadMs,
    );
    const upcoming = await this.repository.findUpcomingSessions(
      guild.id,
      now,
      QueueActivationConfig.maximumUpcomingSessions,
    );

    if (!upcoming.some((session) => session.startsAt <= dueAt)) {
      return;
    }

    const [role, channel] = await Promise.all([
      this.resolveAlertRole(guild),
      this.channels.resolveTextChannel(guild, "matchmakingStatus"),
    ]);

    if (!channel || role.members.size === 0) {
      return;
    }

    const sessions = await this.repository.claimDueNotifications(
      guild.id,
      dueAt,
      now,
      QueueActivationConfig.maximumUpcomingSessions,
    );

    if (sessions.length === 0) {
      return;
    }

    for (const session of sessions) {
      try {
        await channel.send({
          components: [createQueueSessionReminderView(role.id, session)],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { roles: [role.id] },
        });
        await this.repository.finishNotification(session.id, now);
      } catch (error: unknown) {
        await this.repository.releaseNotification(session.id);
        logger.warn(
          `Unable to publish queue session ${session.id} in guild ${guild.id}: ${String(error)}`,
        );
      }
    }
  }

  private async resolveAlertRole(guild: Guild): Promise<Role> {
    const roleName = GuildBlueprint.roles.find(
      (role) => role.key === "squadAlerts",
    )?.name;
    let role = guild.roles.cache.find(
      (candidate) => candidate.name === roleName,
    );

    if (!role) {
      await guild.roles.fetch();
      role = guild.roles.cache.find(
        (candidate) => candidate.name === roleName,
      );
    }

    if (!role) {
      throw new QueueActivationError(
        "The managed Squad Alerts role is unavailable. Ask the owner to run `/server-setup`.",
      );
    }

    return role;
  }
}
