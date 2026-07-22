import {
  MessageFlags,
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
} from "discord.js";

import {
  CommunityModerationConfig,
  formatCommunityCaseReference,
  type CommunityModerationAction,
  type CommunityModerationSource,
} from "../../constants/communityModeration.js";
import { logger } from "../../config/logger.js";
import type { CommunityModerationCaseDocument } from "../../models/CommunityModerationCaseModel.js";
import type { CommunityModerationRepository } from "../../repositories/CommunityModerationRepository.js";
import { formatError } from "../../utils/formatError.js";
import { CommunityModerationError } from "../errors/CommunityModerationError.js";
import { createCommunityModerationCaseView } from "../ui/createCommunityModerationCaseView.js";
import type { ManagedCommunityChannelResolver } from "./ManagedCommunityChannelResolver.js";

export const MemberModerationActions = [
  "warning",
  "timeout",
  "timeout_removed",
  "kick",
  "ban",
] as const;

export type MemberModerationAction = (typeof MemberModerationActions)[number];

export interface RequestMemberModerationInput {
  readonly guild: Guild;
  readonly actor: GuildMember;
  readonly targetDiscordId: string;
  readonly action: MemberModerationAction;
  readonly reason: string;
  readonly durationMs?: number | null;
  readonly source?: CommunityModerationSource;
  readonly relatedReportId?: string | null;
  readonly channelId?: string | null;
  readonly messageId?: string | null;
}

export interface RecordChannelActionInput {
  readonly guild: Guild;
  readonly actorDiscordId: string;
  readonly action: Extract<
    CommunityModerationAction,
    "purge" | "channel_lock" | "channel_unlock" | "slowmode" | "message_delete"
  >;
  readonly reason: string;
  readonly channelId: string;
  readonly targetDiscordId?: string | null;
  readonly messageId?: string | null;
  readonly details?: {
    readonly messageCount?: number;
    readonly slowmodeSeconds?: number;
    readonly automodRule?: string;
  };
}

export class CommunityModerationService {
  public constructor(
    private readonly repository: CommunityModerationRepository,
    private readonly channels: ManagedCommunityChannelResolver,
  ) {}

  public async requestMemberAction(
    input: RequestMemberModerationInput,
  ): Promise<CommunityModerationCaseDocument> {
    this.assertStaff(input.actor);
    const target = await this.fetchTarget(input.guild, input.targetDiscordId);
    this.assertTarget(input.guild, input.actor, target, input.action);
    const reason = this.normalizeReason(input.reason);
    if (
      input.action === "timeout" &&
      (!input.durationMs ||
        input.durationMs <= 0 ||
        input.durationMs > 28 * 24 * 60 * 60 * 1_000)
    ) {
      throw new CommunityModerationError(
        "Select a valid timeout duration of no more than 28 days.",
      );
    }
    const now = new Date();
    const confirmationRequired =
      input.action === "kick" || input.action === "ban";
    const pendingUntil = confirmationRequired
      ? new Date(
          now.getTime() + CommunityModerationConfig.pendingActionDurationMs,
        )
      : null;
    const moderationCase = await this.repository.createCase({
      guildId: input.guild.id,
      source: input.source ?? "manual",
      action: input.action,
      status: "pending",
      actorDiscordId: input.actor.id,
      targetDiscordId: target.id,
      reason,
      durationMs: input.durationMs ?? null,
      pendingUntil,
      relatedReportId: input.relatedReportId ?? null,
      channelId: input.channelId ?? null,
      messageId: input.messageId ?? null,
      purgeAt: this.retentionDate(now),
    });

    if (confirmationRequired) {
      await this.publishCase(input.guild, moderationCase);
      return moderationCase;
    }

    return this.executePendingCase(input.guild, input.actor, moderationCase);
  }

  public async confirmCase(
    guild: Guild,
    actor: GuildMember,
    caseId: string,
  ): Promise<CommunityModerationCaseDocument> {
    this.assertStaff(actor);
    const moderationCase = await this.getPendingOwnedCase(
      guild.id,
      actor.id,
      caseId,
    );

    return this.executePendingCase(guild, actor, moderationCase);
  }

  public async cancelCase(
    guild: Guild,
    actor: GuildMember,
    caseId: string,
  ): Promise<CommunityModerationCaseDocument> {
    this.assertStaff(actor);
    const cancelled = await this.repository.cancelCase(
      guild.id,
      caseId,
      actor.id,
      this.retentionDate(),
    );

    if (!cancelled) {
      throw new CommunityModerationError(
        "This pending moderation action is unavailable or belongs to another moderator.",
      );
    }

    await this.publishCase(guild, cancelled);
    return cancelled;
  }

  public async reverseCase(
    guild: Guild,
    actor: GuildMember,
    caseNumber: number,
    reasonInput: string,
  ): Promise<CommunityModerationCaseDocument> {
    this.assertStaff(actor);
    const moderationCase = await this.repository.findCaseByNumber(
      guild.id,
      caseNumber,
    );

    if (!moderationCase || moderationCase.status !== "completed") {
      throw new CommunityModerationError(
        "This completed moderation case is unavailable.",
      );
    }

    const reversible = new Set<CommunityModerationAction>([
      "warning",
      "timeout",
      "ban",
    ]);

    if (!reversible.has(moderationCase.action)) {
      throw new CommunityModerationError(
        "This action cannot be reversed. Kicks and message removals are permanent events.",
      );
    }

    if (!moderationCase.targetDiscordId) {
      throw new CommunityModerationError("This case has no member target.");
    }

    const reason = this.normalizeReason(reasonInput);

    try {
      if (moderationCase.action === "timeout") {
        const target = await this.fetchTarget(
          guild,
          moderationCase.targetDiscordId,
        );
        this.assertTarget(guild, actor, target, "timeout_removed");
        await target.timeout(null, reason);
      }

      if (moderationCase.action === "ban") {
        await guild.bans.remove(moderationCase.targetDiscordId, reason);
      }
    } catch (error: unknown) {
      throw new CommunityModerationError(
        `Discord could not reverse this action: ${this.errorMessage(error)}`,
      );
    }

    const reversed = await this.repository.reverseCase(
      moderationCase.id,
      actor.id,
      reason,
      this.retentionDate(),
    );

    if (!reversed) {
      throw new CommunityModerationError(
        "The moderation case changed before it could be reversed.",
      );
    }

    await this.publishCase(guild, reversed);
    return reversed;
  }

  public async getHistory(
    guildId: string,
    targetDiscordId: string,
  ): Promise<CommunityModerationCaseDocument[]> {
    return this.repository.findRecentCasesForTarget(
      guildId,
      targetDiscordId,
      CommunityModerationConfig.historyLimit,
    );
  }

  public async expirePendingCases(
    guildId: string,
    now = new Date(),
  ): Promise<number> {
    return this.repository.expirePendingCases(
      guildId,
      now,
      this.retentionDate(now),
    );
  }

  public async recordChannelAction(
    input: RecordChannelActionInput,
  ): Promise<CommunityModerationCaseDocument> {
    const now = new Date();
    const moderationCase = await this.repository.createCase({
      guildId: input.guild.id,
      source: input.details?.automodRule ? "automod" : "manual",
      action: input.action,
      status: "completed",
      actorDiscordId: input.details?.automodRule ? null : input.actorDiscordId,
      targetDiscordId: input.targetDiscordId ?? null,
      reason: this.normalizeReason(input.reason),
      channelId: input.channelId,
      messageId: input.messageId ?? null,
      details: { ...input.details },
      purgeAt: this.retentionDate(now),
    });

    await this.publishCase(input.guild, moderationCase);
    return moderationCase;
  }

  public async applyAutomod(
    guild: Guild,
    target: GuildMember,
    rule: string,
    channelId: string,
    messageId: string,
  ): Promise<CommunityModerationCaseDocument> {
    const since = new Date(
      Date.now() - CommunityModerationConfig.automodEscalationWindowMs,
    );
    const recentCases = await this.repository.countRecentAutomodCases(
      guild.id,
      target.id,
      since,
    );
    const now = new Date();
    const timeout = recentCases > 0 && target.moderatable;
    const moderationCase = await this.repository.createCase({
      guildId: guild.id,
      source: "automod",
      action: timeout ? "timeout" : "message_delete",
      status: "pending",
      actorDiscordId: null,
      targetDiscordId: target.id,
      reason: `Automod: ${rule}`,
      durationMs: timeout ? CommunityModerationConfig.automodTimeoutMs : null,
      channelId,
      messageId,
      details: { automodRule: rule },
      purgeAt: this.retentionDate(now),
    });

    try {
      if (timeout) {
        await target.timeout(
          CommunityModerationConfig.automodTimeoutMs,
          moderationCase.reason,
        );
      }

      const completed = await this.repository.completeCase(
        moderationCase.id,
        timeout
          ? new Date(now.getTime() + CommunityModerationConfig.automodTimeoutMs)
          : null,
        this.retentionDate(now),
      );

      if (!completed) {
        throw new Error("The automod case could not be completed.");
      }

      await this.publishCase(guild, completed);
      await this.notifyTarget(target, completed);
      return completed;
    } catch (error: unknown) {
      await this.repository.failCase(
        moderationCase.id,
        this.errorMessage(error),
        this.retentionDate(),
      );
      throw error;
    }
  }

  private async executePendingCase(
    guild: Guild,
    actor: GuildMember,
    moderationCase: CommunityModerationCaseDocument,
  ): Promise<CommunityModerationCaseDocument> {
    if (!moderationCase.targetDiscordId) {
      throw new CommunityModerationError("This case has no member target.");
    }

    const target = await this.fetchTarget(
      guild,
      moderationCase.targetDiscordId,
    );
    this.assertTarget(
      guild,
      actor,
      target,
      moderationCase.action as MemberModerationAction,
    );
    const now = new Date();
    let expiresAt: Date | null = null;

    try {
      await this.notifyTarget(target, moderationCase);

      switch (moderationCase.action) {
        case "warning":
          break;
        case "timeout": {
          const duration = moderationCase.durationMs;

          if (!duration) {
            throw new CommunityModerationError(
              "A timeout duration is required.",
            );
          }

          await target.timeout(duration, moderationCase.reason);
          expiresAt = new Date(now.getTime() + duration);
          break;
        }
        case "timeout_removed":
          await target.timeout(null, moderationCase.reason);
          break;
        case "kick":
          await target.kick(moderationCase.reason);
          break;
        case "ban":
          await guild.members.ban(target.id, {
            deleteMessageSeconds: 0,
            reason: moderationCase.reason,
          });
          break;
        default:
          throw new CommunityModerationError(
            "This member action is not supported.",
          );
      }

      const completed = await this.repository.completeCase(
        moderationCase.id,
        expiresAt,
        this.retentionDate(now),
      );

      if (!completed) {
        throw new CommunityModerationError(
          "The action expired or was already processed.",
        );
      }

      if (completed.relatedReportId) {
        await this.repository.resolveReport(
          completed.relatedReportId,
          "resolved",
          actor.id,
          `Resolved through ${formatCommunityCaseReference(completed.caseNumber)}.`,
          completed.id,
          this.retentionDate(now),
        );
      }

      await this.publishCase(guild, completed);
      return completed;
    } catch (error: unknown) {
      await this.repository.failCase(
        moderationCase.id,
        this.errorMessage(error),
        this.retentionDate(now),
      );

      if (error instanceof CommunityModerationError) {
        throw error;
      }

      throw new CommunityModerationError(
        `Discord rejected the moderation action: ${this.errorMessage(error)}`,
      );
    }
  }

  private async getPendingOwnedCase(
    guildId: string,
    actorDiscordId: string,
    caseId: string,
  ): Promise<CommunityModerationCaseDocument> {
    if (!/^[a-f\d]{24}$/i.test(caseId)) {
      throw new CommunityModerationError("The moderation case is invalid.");
    }

    const moderationCase = await this.repository.findCaseById(guildId, caseId);

    if (
      !moderationCase ||
      moderationCase.status !== "pending" ||
      moderationCase.actorDiscordId !== actorDiscordId ||
      !moderationCase.pendingUntil ||
      moderationCase.pendingUntil <= new Date()
    ) {
      throw new CommunityModerationError(
        "This pending action expired, was already handled, or belongs to another moderator.",
      );
    }

    return moderationCase;
  }

  private assertStaff(actor: GuildMember): void {
    if (!actor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      throw new CommunityModerationError(
        "You need the Moderate Members permission to use Community moderation.",
      );
    }
  }

  private assertTarget(
    guild: Guild,
    actor: GuildMember,
    target: GuildMember,
    action: MemberModerationAction,
  ): void {
    if (target.id === actor.id) {
      throw new CommunityModerationError("You cannot moderate yourself.");
    }

    if (target.id === guild.ownerId) {
      throw new CommunityModerationError(
        "The Discord server owner cannot be targeted.",
      );
    }

    if (target.user.bot) {
      throw new CommunityModerationError("Bots cannot be targeted here.");
    }

    if (
      actor.id !== guild.ownerId &&
      actor.roles.highest.comparePositionTo(target.roles.highest) <= 0
    ) {
      throw new CommunityModerationError(
        "Your highest role must be above the target member's highest role.",
      );
    }

    if (
      (action === "timeout" || action === "timeout_removed") &&
      !target.moderatable
    ) {
      throw new CommunityModerationError(
        "Vora cannot moderate this member. Check the bot role hierarchy.",
      );
    }

    if (action === "kick" && !target.kickable) {
      throw new CommunityModerationError(
        "Vora cannot kick this member. Check the bot role hierarchy.",
      );
    }

    if (action === "ban" && !target.bannable) {
      throw new CommunityModerationError(
        "Vora cannot ban this member. Check the bot role hierarchy.",
      );
    }
  }

  private async fetchTarget(
    guild: Guild,
    targetDiscordId: string,
  ): Promise<GuildMember> {
    const target = await guild.members.fetch(targetDiscordId).catch(() => null);

    if (!target) {
      throw new CommunityModerationError(
        "The target is no longer a member of this server.",
      );
    }

    return target;
  }

  private normalizeReason(reasonInput: string): string {
    const reason = reasonInput.trim().replace(/\s+/g, " ");

    if (reason.length < 3 || reason.length > 500) {
      throw new CommunityModerationError(
        "A moderation reason must contain between 3 and 500 characters.",
      );
    }

    return reason;
  }

  private async notifyTarget(
    target: GuildMember,
    moderationCase: CommunityModerationCaseDocument,
  ): Promise<void> {
    await target
      .send(
        [
          `**Vora Community moderation — ${formatCommunityCaseReference(moderationCase.caseNumber)}**`,
          `Action: **${moderationCase.action.replace("_", " ")}**`,
          `Reason: ${moderationCase.reason}`,
          moderationCase.durationMs
            ? `Duration: ${Math.ceil(moderationCase.durationMs / 60_000)} minutes`
            : null,
          "You may appeal this action through a private support ticket and include the case reference above.",
        ]
          .filter((line): line is string => Boolean(line))
          .join("\n"),
      )
      .catch(() => undefined);
  }

  private async publishCase(
    guild: Guild,
    moderationCase: CommunityModerationCaseDocument,
  ): Promise<void> {
    try {
      const channel = await this.channels.resolveTextChannel(
        guild,
        "moderationLog",
      );

      if (!channel) {
        logger.warn(
          `Unable to publish community moderation case ${moderationCase.id}: moderation-log is unavailable.`,
        );
        return;
      }

      await channel.send({
        components: [createCommunityModerationCaseView(moderationCase)],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
    } catch (error: unknown) {
      logger.error(
        `Unable to publish community moderation case ${moderationCase.id}:\n${formatError(error)}`,
      );
    }
  }

  private retentionDate(from = new Date()): Date {
    return new Date(
      from.getTime() + CommunityModerationConfig.recordRetentionMs,
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
