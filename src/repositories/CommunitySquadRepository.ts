import { isValidObjectId } from "mongoose";

import {
  CommunitySquadModel,
  type CommunitySquadDocument,
} from "../models/CommunitySquadModel.js";
import type {
  CommunitySquadFoundingStatus,
  CommunitySquadRegion,
} from "../constants/communitySquad.js";
import type { PlayerRole } from "../constants/playerRoles.js";
import type {
  CommunitySquadMember,
  CommunitySquadSummary,
} from "../types/communitySquad.js";

function copyMember(member: CommunitySquadMember): CommunitySquadMember {
  return {
    discordId: member.discordId,
    joinedAt: new Date(member.joinedAt),
  };
}

function summary(squad: CommunitySquadDocument): CommunitySquadSummary {
  return {
    id: squad.id,
    guildId: squad.guildId,
    name: squad.name,
    tag: squad.tag,
    description: squad.description ?? null,
    region: squad.region,
    inviteCode: squad.inviteCode,
    captainDiscordId: squad.captainDiscordId,
    members: squad.members.map(copyMember),
    recruitingRoles: [...squad.recruitingRoles],
    founding: {
      status: squad.founding.status,
      appliedAt: squad.founding.appliedAt
        ? new Date(squad.founding.appliedAt)
        : null,
      reviewedAt: squad.founding.reviewedAt
        ? new Date(squad.founding.reviewedAt)
        : null,
      reviewedByDiscordId: squad.founding.reviewedByDiscordId ?? null,
      rejectionReason: squad.founding.rejectionReason ?? null,
    },
    createdAt: new Date(squad.createdAt),
    updatedAt: new Date(squad.updatedAt),
  };
}

export class CommunitySquadRepository {
  public async findByMember(guildId: string, discordId: string) {
    const squad = await CommunitySquadModel.findOne({
      guildId,
      status: "active",
      "members.discordId": discordId,
    }).exec();
    return squad ? summary(squad) : null;
  }

  public async findByInviteCode(guildId: string, inviteCode: string) {
    const squad = await CommunitySquadModel.findOne({
      guildId,
      inviteCode,
      status: "active",
    }).exec();
    return squad ? summary(squad) : null;
  }

  public async existsName(guildId: string, normalizedName: string) {
    return (
      (await CommunitySquadModel.exists({
        guildId,
        normalizedName,
        status: "active",
      })) !== null
    );
  }

  public async existsInviteCode(guildId: string, inviteCode: string) {
    return (
      (await CommunitySquadModel.exists({
        guildId,
        inviteCode,
        status: "active",
      })) !== null
    );
  }

  public async create(input: {
    guildId: string;
    name: string;
    normalizedName: string;
    tag: string;
    description: string | null;
    region: CommunitySquadRegion;
    inviteCode: string;
    captainDiscordId: string;
    createdAt: Date;
  }) {
    return summary(
      await CommunitySquadModel.create({
        guildId: input.guildId,
        name: input.name,
        normalizedName: input.normalizedName,
        tag: input.tag,
        description: input.description,
        region: input.region,
        inviteCode: input.inviteCode,
        captainDiscordId: input.captainDiscordId,
        members: [
          {
            discordId: input.captainDiscordId,
            joinedAt: input.createdAt,
          },
        ],
        recruitingRoles: [],
        founding: {},
        status: "active",
        archivedAt: null,
      }),
    );
  }

  public async addMember(
    squadId: string,
    discordId: string,
    joinedAt: Date,
    maximumMembers: number,
  ) {
    if (!isValidObjectId(squadId)) {
      return null;
    }

    const squad = await CommunitySquadModel.findOneAndUpdate(
      {
        _id: squadId,
        status: "active",
        "members.discordId": { $ne: discordId },
        $expr: { $lt: [{ $size: "$members" }, maximumMembers] },
      },
      { $push: { members: { discordId, joinedAt } } },
      { returnDocument: "after", runValidators: true },
    ).exec();
    return squad ? summary(squad) : null;
  }

  public async removeMember(squadId: string, discordId: string) {
    if (!isValidObjectId(squadId)) {
      return null;
    }

    const squad = await CommunitySquadModel.findOneAndUpdate(
      {
        _id: squadId,
        status: "active",
        captainDiscordId: { $ne: discordId },
        "members.discordId": discordId,
      },
      { $pull: { members: { discordId } } },
      { returnDocument: "after", runValidators: true },
    ).exec();
    return squad ? summary(squad) : null;
  }

  public async setRecruitingRoles(
    squadId: string,
    recruitingRoles: readonly PlayerRole[],
  ) {
    return this.updateById(squadId, {
      $set: { recruitingRoles: [...recruitingRoles] },
    });
  }

  public async updateProfile(
    squadId: string,
    profile: {
      name: string;
      normalizedName: string;
      tag: string;
      description: string | null;
      region: CommunitySquadRegion;
    },
  ) {
    return this.updateById(squadId, { $set: profile });
  }

  public async setInviteCode(squadId: string, inviteCode: string) {
    return this.updateById(squadId, { $set: { inviteCode } });
  }

  public async transferCaptain(
    squadId: string,
    currentCaptainDiscordId: string,
    nextCaptainDiscordId: string,
  ) {
    if (!isValidObjectId(squadId)) {
      return null;
    }

    const squad = await CommunitySquadModel.findOneAndUpdate(
      {
        _id: squadId,
        status: "active",
        captainDiscordId: currentCaptainDiscordId,
        "members.discordId": nextCaptainDiscordId,
      },
      { $set: { captainDiscordId: nextCaptainDiscordId } },
      { returnDocument: "after", runValidators: true },
    ).exec();
    return squad ? summary(squad) : null;
  }

  public async setFoundingStatus(
    squadId: string,
    status: CommunitySquadFoundingStatus,
    input: {
      appliedAt?: Date | null;
      reviewedAt?: Date | null;
      reviewedByDiscordId?: string | null;
      rejectionReason?: string | null;
    },
  ) {
    return this.updateById(squadId, {
      $set: {
        "founding.status": status,
        ...(input.appliedAt !== undefined
          ? { "founding.appliedAt": input.appliedAt }
          : {}),
        ...(input.reviewedAt !== undefined
          ? { "founding.reviewedAt": input.reviewedAt }
          : {}),
        ...(input.reviewedByDiscordId !== undefined
          ? {
              "founding.reviewedByDiscordId": input.reviewedByDiscordId,
            }
          : {}),
        ...(input.rejectionReason !== undefined
          ? { "founding.rejectionReason": input.rejectionReason }
          : {}),
      },
    });
  }

  public async findFoundingApplications(guildId: string, limit = 20) {
    const squads = await CommunitySquadModel.find({
      guildId,
      status: "active",
      "founding.status": "applied",
    })
      .sort({ "founding.appliedAt": 1 })
      .limit(limit)
      .exec();
    return squads.map(summary);
  }

  public async archive(
    squadId: string,
    captainDiscordId: string,
    archivedAt: Date,
  ) {
    if (!isValidObjectId(squadId)) {
      return null;
    }

    const squad = await CommunitySquadModel.findOneAndUpdate(
      {
        _id: squadId,
        status: "active",
        captainDiscordId,
      },
      {
        $set: {
          status: "archived",
          archivedAt,
          inviteCode: `ARCH${squadId.slice(-4).toUpperCase()}`,
          recruitingRoles: [],
        },
      },
      { returnDocument: "after", runValidators: true },
    ).exec();
    return squad ? summary(squad) : null;
  }

  private async updateById(
    squadId: string,
    update: Record<string, unknown>,
  ) {
    if (!isValidObjectId(squadId)) {
      return null;
    }

    const squad = await CommunitySquadModel.findOneAndUpdate(
      { _id: squadId, status: "active" },
      update,
      { returnDocument: "after", runValidators: true },
    ).exec();
    return squad ? summary(squad) : null;
  }
}
