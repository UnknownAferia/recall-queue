import { MessageFlags, type Guild, type GuildMember } from "discord.js";

import { CommunityConfig } from "../../constants/community.js";
import { isPlayerVerificationApproved } from "../../constants/playerVerification.js";
import type { PlayerDto } from "../../dto/PlayerDto.js";
import { PlayerVerificationMapper } from "../../mappers/PlayerVerificationMapper.js";
import type { MemberOnboardingRepository } from "../../repositories/MemberOnboardingRepository.js";
import type { OnboardingAudienceExclusionRepository } from "../../repositories/OnboardingAudienceExclusionRepository.js";
import type { PlayerVerificationRepository } from "../../repositories/PlayerVerificationRepository.js";
import type { PlayerService } from "../../services/PlayerService.js";
import type {
  PlayerVerificationEvidenceHealth,
  PlayerVerificationEvidenceService,
} from "../../services/PlayerVerificationEvidenceService.js";
import { OnboardingAudienceError } from "../errors/OnboardingAudienceError.js";
import { createMemberOnboardingView } from "../ui/createMemberOnboardingView.js";
import type { OnboardingSnapshot } from "../ui/createOnboardingDashboardView.js";
import type { ManagedCommunityChannelResolver } from "./ManagedCommunityChannelResolver.js";

export interface OnboardingReminderResult {
  readonly eligible: number;
  readonly attempted: number;
  readonly delivered: number;
  readonly failed: number;
}

export interface VerificationWorklistEntry {
  readonly discordId: string;
  readonly ign: string;
  readonly profileStatus: PlayerDto["verification"]["status"];
  readonly state: "evidence_required" | "awaiting_review";
  readonly requestId: string | null;
  readonly submittedAt: Date | null;
  readonly evidenceChannelId: string | null;
  readonly evidenceMessageId: string | null;
  readonly evidenceHealth: PlayerVerificationEvidenceHealth | null;
}

export interface VerificationWorklist {
  readonly evidenceRequired: readonly VerificationWorklistEntry[];
  readonly awaitingReview: readonly VerificationWorklistEntry[];
}

interface OnboardingAudience {
  readonly humanMembers: readonly GuildMember[];
  readonly members: readonly GuildMember[];
  readonly excludedMemberIds: ReadonlySet<string>;
  readonly playersByDiscordId: ReadonlyMap<string, PlayerDto>;
  readonly pendingVerificationIds: ReadonlySet<string>;
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
      "findPendingByGuild" | "findPendingPlayerDiscordIds"
    >,
    private readonly exclusions: Pick<
      OnboardingAudienceExclusionRepository,
      "findActiveByGuild" | "isActive" | "excludeMany" | "restore"
    >,
    private readonly verificationEvidence: Pick<
      PlayerVerificationEvidenceService,
      "inspectArchive"
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
        (player) => !isPlayerVerificationApproved(player.verification.status),
      )
      .map((player) => player.discord.id);
    const awaitingOperationsReview = unverifiedPlayerDiscordIds.filter(
      (playerDiscordId) => audience.pendingVerificationIds.has(playerDiscordId),
    ).length;
    const verificationRequired =
      unverifiedPlayerDiscordIds.length - awaitingOperationsReview;

    return {
      members: audience.humanMembers.length,
      excluded: audience.excludedMemberIds.size,
      eligibleMembers: audience.members.length,
      registered: registeredPlayers.length,
      verified,
      unregistered: audience.members.length - registeredPlayers.length,
      verificationRequired,
      awaitingOperationsReview,
      reminderEligible: audience.reminderEligibleIds.size,
    };
  }

  public async getVerificationWorklist(
    guild: Guild,
  ): Promise<VerificationWorklist> {
    const audience = await this.createAudience(guild);
    const unverifiedPlayers = [...audience.playersByDiscordId.values()].filter(
      (player) => !isPlayerVerificationApproved(player.verification.status),
    );
    const requests = await this.verifications.findPendingByGuild(
      guild.id,
      unverifiedPlayers.map((player) => player.discord.id),
    );
    const requestsByPlayer = new Map(
      requests.map((request) => [request.playerDiscordId, request]),
    );
    const evidenceRequired: VerificationWorklistEntry[] = [];
    const awaitingReview: VerificationWorklistEntry[] = [];

    for (const player of unverifiedPlayers) {
      const request = requestsByPlayer.get(player.discord.id);

      if (!request) {
        evidenceRequired.push({
          discordId: player.discord.id,
          ign: player.game.ign,
          profileStatus: player.verification.status,
          state: "evidence_required",
          requestId: null,
          submittedAt: null,
          evidenceChannelId: null,
          evidenceMessageId: null,
          evidenceHealth: null,
        });
        continue;
      }

      const dto = PlayerVerificationMapper.toDto(request);
      awaitingReview.push({
        discordId: player.discord.id,
        ign: player.game.ign,
        profileStatus: player.verification.status,
        state: "awaiting_review",
        requestId: dto.id,
        submittedAt: dto.submittedAt,
        evidenceChannelId: dto.evidence.archiveChannelId,
        evidenceMessageId: dto.evidence.archiveMessageId,
        evidenceHealth: await this.verificationEvidence.inspectArchive(
          guild,
          dto.evidence,
        ),
      });
    }

    return {
      evidenceRequired: evidenceRequired.sort((left, right) =>
        left.ign.localeCompare(right.ign),
      ),
      awaitingReview,
    };
  }

  public async welcome(member: GuildMember): Promise<boolean> {
    if (member.user.bot) {
      return false;
    }

    if (await this.exclusions.isActive(member.guild.id, member.id)) {
      return false;
    }

    const [player] = await this.players.getByDiscordIds([member.id]);

    if (player && isPlayerVerificationApproved(player.verification.status)) {
      return false;
    }

    return this.deliver(member);
  }

  public async excludeRole(
    guild: Guild,
    roleId: string,
    actorDiscordId: string,
    reason?: string,
  ): Promise<number> {
    if (roleId === guild.id) {
      throw new OnboardingAudienceError(
        "The @everyone role cannot be excluded from onboarding.",
      );
    }

    const role = await guild.roles.fetch(roleId);

    if (!role) {
      throw new OnboardingAudienceError(
        "The selected Discord role is no longer available.",
      );
    }

    const members = (await this.listHumanMembers(guild)).filter((member) =>
      member.roles.cache.has(role.id),
    );

    if (members.length === 0) {
      throw new OnboardingAudienceError(
        "The selected role currently has no human members.",
      );
    }

    return this.exclusions.excludeMany(
      guild.id,
      members.map((member) => member.id),
      actorDiscordId,
      this.normalizeExclusionReason(reason, `Snapshot of role ${role.name}`),
      this.now(),
    );
  }

  public async excludeMember(
    member: GuildMember,
    actorDiscordId: string,
    reason?: string,
  ): Promise<void> {
    if (member.user.bot) {
      throw new OnboardingAudienceError(
        "Discord bots are already excluded automatically.",
      );
    }

    await this.exclusions.excludeMany(
      member.guild.id,
      [member.id],
      actorDiscordId,
      this.normalizeExclusionReason(reason, "Manual Operations exclusion"),
      this.now(),
    );
  }

  public async restoreMember(
    guildId: string,
    memberDiscordId: string,
    actorDiscordId: string,
  ): Promise<boolean> {
    return this.exclusions.restore(
      guildId,
      memberDiscordId,
      actorDiscordId,
      this.now(),
    );
  }

  public async listExclusions(guildId: string) {
    return this.exclusions.findActiveByGuild(guildId);
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
    const [humanMembers, contacts, exclusions] = await Promise.all([
      this.listHumanMembers(guild),
      this.repository.findByGuild(guild.id),
      this.exclusions.findActiveByGuild(guild.id),
    ]);
    const currentHumanMemberIds = new Set(
      humanMembers.map((member) => member.id),
    );
    const excludedMemberIds = new Set(
      exclusions
        .map((exclusion) => exclusion.memberDiscordId)
        .filter((memberDiscordId) =>
          currentHumanMemberIds.has(memberDiscordId),
        ),
    );
    const members = humanMembers.filter(
      (member) => !excludedMemberIds.has(member.id),
    );
    const players = await this.players.getByDiscordIds(
      members.map((member) => member.id),
    );
    const playersByDiscordId = new Map(
      players.map((player) => [player.discord.id, player]),
    );
    const pendingVerificationIds = new Set(
      await this.verifications.findPendingPlayerDiscordIds(
        guild.id,
        players
          .filter(
            (player) =>
              !isPlayerVerificationApproved(player.verification.status),
          )
          .map((player) => player.discord.id),
      ),
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

          if (pendingVerificationIds.has(member.id)) {
            return false;
          }

          const contact = contactsByDiscordId.get(member.id);
          return !contact || contact.lastReminderAt <= dueBefore;
        })
        .map((member) => member.id),
    );

    return {
      humanMembers,
      members,
      excludedMemberIds,
      playersByDiscordId,
      pendingVerificationIds,
      reminderEligibleIds,
    };
  }

  private normalizeExclusionReason(
    reason: string | undefined,
    fallback: string,
  ): string {
    const normalized = reason?.trim().replace(/\s+/g, " ") || fallback;

    if (normalized.length < 3 || normalized.length > 300) {
      throw new OnboardingAudienceError(
        "Provide an exclusion reason between 3 and 300 characters.",
      );
    }

    return normalized;
  }

  private async listHumanMembers(
    guild: Guild,
  ): Promise<readonly GuildMember[]> {
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

      members.push(...[...page.values()].filter((member) => !member.user.bot));

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
