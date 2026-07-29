import { randomBytes } from "node:crypto";

import {
  CommunitySquadConfig,
  CommunitySquadRegions,
  normalizeCommunitySquadInviteCode,
  normalizeCommunitySquadTag,
  normalizeRecruitingRoles,
  type CommunitySquadFoundingStatus,
  type CommunitySquadRegion,
} from "../../constants/communitySquad.js";
import {
  isPlayerVerificationApproved,
  normalizePlayerVerificationStatus,
} from "../../constants/playerVerification.js";
import {
  PlayerRoles,
  normalizePlayerRole,
  type PlayerRole,
} from "../../constants/playerRoles.js";
import type { CommunitySquadRepository } from "../../repositories/CommunitySquadRepository.js";
import type {
  CommunitySquadDashboard,
  CommunitySquadSummary,
  CreateCommunitySquadInput,
} from "../../types/communitySquad.js";
import { CommunitySquadError } from "../errors/CommunitySquadError.js";

interface SquadPlayer {
  readonly discord: { readonly id: string };
  readonly game: { readonly ign: string };
  readonly rating: { readonly rsr: number };
  readonly verification?: { readonly status?: string };
  readonly preferences?: {
    readonly roles?: {
      readonly primary?: string | null;
      readonly secondary?: string | null;
    };
  };
}

interface SquadPlayerSource {
  findByDiscordId(discordId: string): Promise<SquadPlayer | null>;
  findByDiscordIds(discordIds: readonly string[]): Promise<SquadPlayer[]>;
}

type SquadRepository = Pick<
  CommunitySquadRepository,
  | "findByMember"
  | "findByInviteCode"
  | "existsName"
  | "existsInviteCode"
  | "create"
  | "addMember"
  | "removeMember"
  | "setRecruitingRoles"
  | "updateProfile"
  | "setInviteCode"
  | "transferCaptain"
  | "setFoundingStatus"
  | "findFoundingApplications"
  | "archive"
>;

export class CommunitySquadService {
  public constructor(
    private readonly repository: SquadRepository,
    private readonly players: SquadPlayerSource,
    private readonly inviteCodeFactory: () => string = () =>
      randomBytes(CommunitySquadConfig.inviteCodeLength / 2)
        .toString("hex")
        .toUpperCase(),
  ) {}

  public async getDashboard(
    guildId: string,
    discordId: string,
  ): Promise<CommunitySquadDashboard | null> {
    const squad = await this.repository.findByMember(guildId, discordId);
    return squad ? this.toDashboard(squad) : null;
  }

  public async getCaptainSquad(
    guildId: string,
    discordId: string,
  ): Promise<CommunitySquadSummary | null> {
    const squad = await this.repository.findByMember(guildId, discordId);
    return squad?.captainDiscordId === discordId ? squad : null;
  }

  public async create(
    input: CreateCommunitySquadInput,
    now = new Date(),
  ): Promise<CommunitySquadDashboard> {
    await this.requireVerifiedPlayer(input.captainDiscordId);

    if (
      await this.repository.findByMember(
        input.guildId,
        input.captainDiscordId,
      )
    ) {
      throw new CommunitySquadError(
        "You already belong to a Vora Squad. Leave it before creating another.",
      );
    }

    const profile = this.normalizeProfile(input);
    if (
      await this.repository.existsName(input.guildId, profile.normalizedName)
    ) {
      throw new CommunitySquadError(
        "A squad with that name already exists in this server.",
      );
    }

    const inviteCode = await this.createUniqueInviteCode(input.guildId);
    const squad = await this.repository.create({
      guildId: input.guildId,
      ...profile,
      inviteCode,
      captainDiscordId: input.captainDiscordId,
      createdAt: now,
    });
    return this.toDashboard(squad);
  }

  public async join(
    guildId: string,
    discordId: string,
    rawInviteCode: string,
    now = new Date(),
  ): Promise<CommunitySquadDashboard> {
    await this.requireVerifiedPlayer(discordId);

    const current = await this.repository.findByMember(guildId, discordId);
    const inviteCode = normalizeCommunitySquadInviteCode(rawInviteCode);
    if (inviteCode.length !== CommunitySquadConfig.inviteCodeLength) {
      throw new CommunitySquadError(
        "That invite code is invalid. Ask the captain to copy the current code from `/squad`.",
      );
    }

    const target = await this.repository.findByInviteCode(guildId, inviteCode);
    if (!target) {
      throw new CommunitySquadError(
        "That invite code is expired or does not belong to an active squad.",
      );
    }

    if (current) {
      if (current.id === target.id) {
        return this.toDashboard(current);
      }
      throw new CommunitySquadError(
        "You already belong to another Vora Squad.",
      );
    }

    try {
      const joined = await this.repository.addMember(
        target.id,
        discordId,
        now,
        CommunitySquadConfig.maximumMembers,
      );
      if (!joined) {
        throw new CommunitySquadError(
          "This squad is full or no longer accepting members.",
        );
      }
      return this.toDashboard(joined);
    } catch (error: unknown) {
      if (error instanceof CommunitySquadError) {
        throw error;
      }
      throw new CommunitySquadError(
        "You already belong to a squad or this roster changed while you were joining.",
      );
    }
  }

  public async updateProfile(
    guildId: string,
    captainDiscordId: string,
    input: Omit<CreateCommunitySquadInput, "guildId" | "captainDiscordId">,
  ): Promise<CommunitySquadDashboard> {
    const squad = await this.requireCaptain(guildId, captainDiscordId);
    const profile = this.normalizeProfile({
      guildId,
      captainDiscordId,
      ...input,
    });
    if (
      profile.normalizedName !== squad.name.toLocaleLowerCase("en-US") &&
      (await this.repository.existsName(guildId, profile.normalizedName))
    ) {
      throw new CommunitySquadError(
        "A squad with that name already exists in this server.",
      );
    }

    const updated = await this.repository.updateProfile(squad.id, profile);
    if (!updated) {
      throw new CommunitySquadError("The squad could not be updated.");
    }
    return this.toDashboard(updated);
  }

  public async setRecruitingRoles(
    guildId: string,
    captainDiscordId: string,
    roles: readonly PlayerRole[],
  ): Promise<CommunitySquadDashboard> {
    const squad = await this.requireCaptain(guildId, captainDiscordId);
    const normalized = normalizeRecruitingRoles(
      roles.filter((role): role is PlayerRole => PlayerRoles.includes(role)),
    );
    const updated = await this.repository.setRecruitingRoles(
      squad.id,
      normalized,
    );
    if (!updated) {
      throw new CommunitySquadError(
        "Recruitment preferences could not be updated.",
      );
    }
    return this.toDashboard(updated);
  }

  public async regenerateInviteCode(
    guildId: string,
    captainDiscordId: string,
  ): Promise<CommunitySquadDashboard> {
    const squad = await this.requireCaptain(guildId, captainDiscordId);
    const inviteCode = await this.createUniqueInviteCode(guildId);
    const updated = await this.repository.setInviteCode(squad.id, inviteCode);
    if (!updated) {
      throw new CommunitySquadError("A new invite code could not be created.");
    }
    return this.toDashboard(updated);
  }

  public async leave(
    guildId: string,
    discordId: string,
  ): Promise<CommunitySquadSummary> {
    const squad = await this.requireMember(guildId, discordId);
    if (squad.captainDiscordId === discordId) {
      throw new CommunitySquadError(
        "Transfer captaincy or disband the squad before leaving.",
      );
    }
    const updated = await this.repository.removeMember(squad.id, discordId);
    if (!updated) {
      throw new CommunitySquadError("You are no longer part of that squad.");
    }
    return updated;
  }

  public async kick(
    guildId: string,
    captainDiscordId: string,
    memberDiscordId: string,
  ): Promise<CommunitySquadDashboard> {
    const squad = await this.requireCaptain(guildId, captainDiscordId);
    if (memberDiscordId === captainDiscordId) {
      throw new CommunitySquadError(
        "The captain cannot remove themselves. Transfer captaincy first.",
      );
    }
    const updated = await this.repository.removeMember(
      squad.id,
      memberDiscordId,
    );
    if (!updated) {
      throw new CommunitySquadError(
        "Select a current member of your squad.",
      );
    }
    return this.toDashboard(updated);
  }

  public async transferCaptain(
    guildId: string,
    captainDiscordId: string,
    nextCaptainDiscordId: string,
  ): Promise<CommunitySquadDashboard> {
    const squad = await this.requireCaptain(guildId, captainDiscordId);
    if (nextCaptainDiscordId === captainDiscordId) {
      return this.toDashboard(squad);
    }
    const updated = await this.repository.transferCaptain(
      squad.id,
      captainDiscordId,
      nextCaptainDiscordId,
    );
    if (!updated) {
      throw new CommunitySquadError(
        "Select a current member of your squad as the new captain.",
      );
    }
    return this.toDashboard(updated);
  }

  public async applyForFounding(
    guildId: string,
    captainDiscordId: string,
    now = new Date(),
  ): Promise<CommunitySquadDashboard> {
    const squad = await this.requireCaptain(guildId, captainDiscordId);
    if (squad.members.length < CommunitySquadConfig.minimumFoundingMembers) {
      throw new CommunitySquadError(
        `Founding Squad applications unlock after ${CommunitySquadConfig.minimumFoundingMembers} verified members join the roster.`,
      );
    }
    const rosterPlayers = await this.players.findByDiscordIds(
      squad.members.map((member) => member.discordId),
    );
    const verifiedIds = new Set(
      rosterPlayers
        .filter((player) =>
          isPlayerVerificationApproved(
            normalizePlayerVerificationStatus(player.verification?.status),
          ),
        )
        .map((player) => player.discord.id),
    );
    if (
      squad.members.some((member) => !verifiedIds.has(member.discordId))
    ) {
      throw new CommunitySquadError(
        "Every roster member must still have a verified Vora profile before the squad can apply.",
      );
    }
    if (squad.founding.status === "founding") {
      return this.toDashboard(squad);
    }
    if (squad.founding.status === "applied") {
      throw new CommunitySquadError(
        "Your Founding Squad application is already awaiting Operations review.",
      );
    }
    const updated = await this.repository.setFoundingStatus(
      squad.id,
      "applied",
      {
        appliedAt: now,
        reviewedAt: null,
        reviewedByDiscordId: null,
        rejectionReason: null,
      },
    );
    if (!updated) {
      throw new CommunitySquadError(
        "The Founding Squad application could not be submitted.",
      );
    }
    return this.toDashboard(updated);
  }

  public listFoundingApplications(guildId: string) {
    return this.repository.findFoundingApplications(guildId);
  }

  public async reviewFoundingApplication(
    guildId: string,
    inviteCode: string,
    status: Extract<CommunitySquadFoundingStatus, "founding" | "rejected">,
    reviewerDiscordId: string,
    rejectionReason: string | null,
    now = new Date(),
  ): Promise<CommunitySquadDashboard> {
    const normalizedCode = normalizeCommunitySquadInviteCode(inviteCode);
    const squad = await this.repository.findByInviteCode(
      guildId,
      normalizedCode,
    );
    if (!squad || squad.founding.status !== "applied") {
      throw new CommunitySquadError(
        "No pending Founding Squad application matches that code.",
      );
    }
    const reason = rejectionReason?.trim() || null;
    if (status === "rejected" && !reason) {
      throw new CommunitySquadError(
        "Add a short reason when rejecting an application.",
      );
    }
    const updated = await this.repository.setFoundingStatus(squad.id, status, {
      reviewedAt: now,
      reviewedByDiscordId: reviewerDiscordId,
      rejectionReason: status === "rejected" ? reason : null,
    });
    if (!updated) {
      throw new CommunitySquadError(
        "The Founding Squad application could not be reviewed.",
      );
    }
    return this.toDashboard(updated);
  }

  public async disband(
    guildId: string,
    captainDiscordId: string,
    now = new Date(),
  ): Promise<CommunitySquadSummary> {
    const squad = await this.requireCaptain(guildId, captainDiscordId);
    const archived = await this.repository.archive(
      squad.id,
      captainDiscordId,
      now,
    );
    if (!archived) {
      throw new CommunitySquadError("The squad could not be disbanded.");
    }
    return archived;
  }

  private async toDashboard(
    squad: CommunitySquadSummary,
  ): Promise<CommunitySquadDashboard> {
    const players = await this.players.findByDiscordIds(
      squad.members.map((member) => member.discordId),
    );
    const playerById = new Map(
      players.map((player) => [player.discord.id, player]),
    );
    const roster = squad.members.map((member) => {
      const player = playerById.get(member.discordId);
      return {
        discordId: member.discordId,
        ign: player?.game.ign ?? "Unknown player",
        rsr: player?.rating.rsr ?? 0,
        primaryRole: normalizePlayerRole(
          player?.preferences?.roles?.primary ?? null,
        ),
        secondaryRole: normalizePlayerRole(
          player?.preferences?.roles?.secondary ?? null,
        ),
        joinedAt: new Date(member.joinedAt),
        isCaptain: member.discordId === squad.captainDiscordId,
      };
    });
    const coveredRoles = new Set(
      roster.flatMap((member) =>
        [member.primaryRole, member.secondaryRole].filter(
          (role): role is PlayerRole => role !== null,
        ),
      ),
    );

    return {
      ...squad,
      members: squad.members.map((member) => ({
        discordId: member.discordId,
        joinedAt: new Date(member.joinedAt),
      })),
      recruitingRoles: [...squad.recruitingRoles],
      founding: { ...squad.founding },
      roster,
      uncoveredRoles: PlayerRoles.filter((role) => !coveredRoles.has(role)),
    };
  }

  private async requireVerifiedPlayer(discordId: string) {
    const player = await this.players.findByDiscordId(discordId);
    const status = normalizePlayerVerificationStatus(
      player?.verification?.status,
    );
    if (!player || !isPlayerVerificationApproved(status)) {
      throw new CommunitySquadError(
        "Create and verify your Vora profile before joining a persistent squad.",
      );
    }
    return player;
  }

  private async requireMember(guildId: string, discordId: string) {
    const squad = await this.repository.findByMember(guildId, discordId);
    if (!squad) {
      throw new CommunitySquadError(
        "You do not currently belong to a Vora Squad.",
      );
    }
    return squad;
  }

  private async requireCaptain(guildId: string, discordId: string) {
    const squad = await this.requireMember(guildId, discordId);
    if (squad.captainDiscordId !== discordId) {
      throw new CommunitySquadError(
        "Only the squad captain can use that control.",
      );
    }
    return squad;
  }

  private normalizeProfile(input: CreateCommunitySquadInput) {
    const name = input.name.trim().replace(/\s+/g, " ");
    if (
      name.length < CommunitySquadConfig.nameMinimumLength ||
      name.length > CommunitySquadConfig.nameMaximumLength
    ) {
      throw new CommunitySquadError(
        `Squad names must contain between ${CommunitySquadConfig.nameMinimumLength} and ${CommunitySquadConfig.nameMaximumLength} characters.`,
      );
    }
    if (!CommunitySquadRegions.includes(input.region)) {
      throw new CommunitySquadError("Select a valid squad region.");
    }
    const description = input.description?.trim().replace(/\s+/g, " ") || null;
    if (
      description &&
      description.length > CommunitySquadConfig.descriptionMaximumLength
    ) {
      throw new CommunitySquadError(
        `Squad descriptions are limited to ${CommunitySquadConfig.descriptionMaximumLength} characters.`,
      );
    }
    return {
      name,
      normalizedName: name.toLocaleLowerCase("en-US"),
      tag: normalizeCommunitySquadTag(input.tag, name),
      description,
      region: input.region,
    };
  }

  private async createUniqueInviteCode(guildId: string): Promise<string> {
    for (
      let attempt = 0;
      attempt < CommunitySquadConfig.inviteGenerationAttempts;
      attempt += 1
    ) {
      const inviteCode = normalizeCommunitySquadInviteCode(
        this.inviteCodeFactory(),
      ).slice(0, CommunitySquadConfig.inviteCodeLength);
      if (
        inviteCode.length === CommunitySquadConfig.inviteCodeLength &&
        !(await this.repository.existsInviteCode(guildId, inviteCode))
      ) {
        return inviteCode;
      }
    }
    throw new CommunitySquadError(
      "Vora could not create a unique invite code. Please try again.",
    );
  }
}
