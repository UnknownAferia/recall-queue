import { MessageFlags, type Guild, type GuildMember } from "discord.js";

import { CommunityConfig } from "../../constants/community.js";
import { isPlayerVerificationApproved } from "../../constants/playerVerification.js";
import type { PlayerDto } from "../../dto/PlayerDto.js";
import type { MemberOnboardingRepository } from "../../repositories/MemberOnboardingRepository.js";
import type { PlayerVerificationRepository } from "../../repositories/PlayerVerificationRepository.js";
import type { PlayerService } from "../../services/PlayerService.js";
import { createMemberOnboardingView } from "../ui/createMemberOnboardingView.js";
import type { OnboardingSnapshot } from "../ui/createOnboardingDashboardView.js";
import type { ManagedCommunityChannelResolver } from "./ManagedCommunityChannelResolver.js";

export interface OnboardingReminderResult {
  readonly eligible: number;
  readonly attempted: number;
  readonly delivered: number;
  readonly failed: number;
}

interface OnboardingAudience {
  readonly members: readonly GuildMember[];
  readonly playersByDiscordId: ReadonlyMap<string, PlayerDto>;
  readonly reminderEligibleIds: ReadonlySet<string>;
}

interface CachedGuildMembers {
  readonly expiresAt: number;
  readonly members: readonly GuildMember[];
}

export class CommunityOnboardingService {
  private readonly membersByGuild = new Map<string, CachedGuildMembers>();

  public constructor(
    private readonly repository: MemberOnboardingRepository,
    private readonly players: Pick<PlayerService, "getByDiscordIds">,
    private readonly verifications: Pick<
      PlayerVerificationRepository,
      "findPendingPlayerDiscordIds"
    >,
    private readonly channels: ManagedCommunityChannelResolver,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async getSnapshot(guild: Guild): Promise<OnboardingSnapshot> {
    const audience = await this.createAudience(guild);
    const registeredPlayers = audience.members
      .map((member) => audience.playersByDiscordId.get(member.id))
      .filter((player): player is PlayerDto => player !== undefined);
    const verified = registeredPlayers.filter((player) =>
      isPlayerVerificationApproved(player.verification.status),
    ).length;
    const unverifiedPlayerDiscordIds = registeredPlayers
      .filter(
        (player) =>
          !isPlayerVerificationApproved(player.verification.status),
      )
      .map((player) => player.discord.id);
    const pendingPlayerDiscordIds =
      await this.verifications.findPendingPlayerDiscordIds(
        guild.id,
        unverifiedPlayerDiscordIds,
      );
    const awaitingOperationsReview = pendingPlayerDiscordIds.length;
    const verificationRequired =
      unverifiedPlayerDiscordIds.length - awaitingOperationsReview;

    return {
      members: audience.members.length,
      registered: registeredPlayers.length,
      verified,
      unregistered: audience.members.length - registeredPlayers.length,
      verificationRequired,
      awaitingOperationsReview,
      reminderEligible: audience.reminderEligibleIds.size,
    };
  }

  public async welcome(member: GuildMember): Promise<boolean> {
    if (member.user.bot) {
      return false;
    }

    const [player] = await this.players.getByDiscordIds([member.id]);

    if (player && isPlayerVerificationApproved(player.verification.status)) {
      return false;
    }

    return this.deliver(member);
  }

  public async remindEligible(guild: Guild): Promise<OnboardingReminderResult> {
    const audience = await this.createAudience(guild);
    const eligible = audience.members.filter((member) =>
      audience.reminderEligibleIds.has(member.id),
    );
    const selected = eligible.slice(
      0,
      CommunityConfig.onboardingReminderBatchSize,
    );
    let delivered = 0;
    let failed = 0;

    for (const member of selected) {
      if (await this.deliver(member)) {
        delivered += 1;
      } else {
        failed += 1;
      }
    }

    return {
      eligible: eligible.length,
      attempted: selected.length,
      delivered,
      failed,
    };
  }

  private async createAudience(guild: Guild): Promise<OnboardingAudience> {
    const [members, contacts] = await Promise.all([
      this.listHumanMembers(guild),
      this.repository.findByGuild(guild.id),
    ]);
    const players = await this.players.getByDiscordIds(
      members.map((member) => member.id),
    );
    const playersByDiscordId = new Map(
      players.map((player) => [player.discord.id, player]),
    );
    const contactsByDiscordId = new Map(
      contacts.map((contact) => [contact.memberDiscordId, contact]),
    );
    const dueBefore = new Date(
      this.now().getTime() - CommunityConfig.onboardingReminderCooldownMs,
    );
    const reminderEligibleIds = new Set(
      members
        .filter((member) => {
          const player = playersByDiscordId.get(member.id);
          if (
            player &&
            isPlayerVerificationApproved(player.verification.status)
          ) {
            return false;
          }

          const contact = contactsByDiscordId.get(member.id);
          return !contact || contact.lastReminderAt <= dueBefore;
        })
        .map((member) => member.id),
    );

    return {
      members,
      playersByDiscordId,
      reminderEligibleIds,
    };
  }

  private async listHumanMembers(guild: Guild): Promise<readonly GuildMember[]> {
    const now = this.now().getTime();
    const cached = this.membersByGuild.get(guild.id);

    if (cached && cached.expiresAt > now) {
      return cached.members;
    }

    const members: GuildMember[] = [];
    let after: string | undefined;

    while (true) {
      const page = await guild.members.list({
        after,
        limit: 1_000,
        cache: true,
      });

      members.push(
        ...[...page.values()].filter((member) => !member.user.bot),
      );

      if (page.size < 1_000) {
        break;
      }

      const nextAfter = page.last()?.id;

      if (!nextAfter || nextAfter === after) {
        throw new Error("Discord member pagination did not advance.");
      }

      after = nextAfter;
    }

    const result = Object.freeze([...members]);
    this.membersByGuild.set(guild.id, {
      expiresAt: now + CommunityConfig.onboardingMemberCacheMs,
      members: result,
    });

    return result;
  }

  private async deliver(member: GuildMember): Promise<boolean> {
    const sentAt = this.now();
    let failureReason: string | null = null;

    try {
      const registerChannel = await this.channels.resolveTextChannel(
        member.guild,
        "register",
      );

      if (!registerChannel) {
        throw new Error("The managed register channel is unavailable.");
      }

      await member.send({
        components: [
          createMemberOnboardingView(
            `https://discord.com/channels/${member.guild.id}/${registerChannel.id}`,
          ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error: unknown) {
      failureReason =
        error instanceof Error ? error.message.slice(0, 500) : String(error);
    }

    await this.repository.recordReminder(
      member.guild.id,
      member.id,
      sentAt,
      failureReason === null,
      failureReason,
    );

    return failureReason === null;
  }
}
