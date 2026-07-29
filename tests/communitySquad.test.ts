import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  CommunitySquadFoundingStatus,
  CommunitySquadRegion,
} from "../src/constants/communitySquad.js";
import type { PlayerRole } from "../src/constants/playerRoles.js";
import { scrimCommandData } from "../src/community/commands/scrim.js";
import { communitySquadCommandData } from "../src/community/commands/squad.js";
import { CommunitySquadService } from "../src/community/services/CommunitySquadService.js";
import { createCommunitySquadProfileModal } from "../src/community/ui/createCommunitySquadModal.js";
import {
  createCommunitySquadDashboardView,
  createCommunitySquadWelcomeView,
} from "../src/community/ui/createCommunitySquadView.js";
import type {
  CommunitySquadSummary,
  CommunitySquadDashboard,
} from "../src/types/communitySquad.js";

class MemoryCommunitySquads {
  public squad: CommunitySquadSummary | null = null;

  public async findByMember(guildId: string, discordId: string) {
    return this.squad?.guildId === guildId &&
      this.squad.members.some((member) => member.discordId === discordId)
      ? this.copy(this.squad)
      : null;
  }

  public async findByInviteCode(guildId: string, inviteCode: string) {
    return this.squad?.guildId === guildId &&
      this.squad.inviteCode === inviteCode
      ? this.copy(this.squad)
      : null;
  }

  public async existsName(guildId: string, normalizedName: string) {
    return (
      this.squad?.guildId === guildId &&
      this.squad.name.toLowerCase() === normalizedName
    );
  }

  public async existsInviteCode(guildId: string, inviteCode: string) {
    return (
      this.squad?.guildId === guildId &&
      this.squad.inviteCode === inviteCode
    );
  }

  public async create(input: {
    guildId: string;
    name: string;
    tag: string;
    description: string | null;
    region: CommunitySquadRegion;
    inviteCode: string;
    captainDiscordId: string;
    createdAt: Date;
  }) {
    this.squad = {
      id: "507f1f77bcf86cd799439011",
      guildId: input.guildId,
      name: input.name,
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
      founding: {
        status: "none",
        appliedAt: null,
        reviewedAt: null,
        reviewedByDiscordId: null,
        rejectionReason: null,
      },
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    };
    return this.copy(this.squad);
  }

  public async addMember(
    squadId: string,
    discordId: string,
    joinedAt: Date,
    maximumMembers: number,
  ) {
    if (
      !this.squad ||
      this.squad.id !== squadId ||
      this.squad.members.length >= maximumMembers
    ) {
      return null;
    }
    this.squad = {
      ...this.squad,
      members: [...this.squad.members, { discordId, joinedAt }],
      updatedAt: joinedAt,
    };
    return this.copy(this.squad);
  }

  public async removeMember(squadId: string, discordId: string) {
    if (
      !this.squad ||
      this.squad.id !== squadId ||
      this.squad.captainDiscordId === discordId ||
      !this.squad.members.some((member) => member.discordId === discordId)
    ) {
      return null;
    }
    this.squad = {
      ...this.squad,
      members: this.squad.members.filter(
        (member) => member.discordId !== discordId,
      ),
    };
    return this.copy(this.squad);
  }

  public async setRecruitingRoles(
    squadId: string,
    recruitingRoles: readonly PlayerRole[],
  ) {
    if (!this.squad || this.squad.id !== squadId) {
      return null;
    }
    this.squad = { ...this.squad, recruitingRoles: [...recruitingRoles] };
    return this.copy(this.squad);
  }

  public async updateProfile(
    squadId: string,
    profile: {
      name: string;
      tag: string;
      description: string | null;
      region: CommunitySquadRegion;
    },
  ) {
    if (!this.squad || this.squad.id !== squadId) {
      return null;
    }
    this.squad = { ...this.squad, ...profile };
    return this.copy(this.squad);
  }

  public async setInviteCode(squadId: string, inviteCode: string) {
    if (!this.squad || this.squad.id !== squadId) {
      return null;
    }
    this.squad = { ...this.squad, inviteCode };
    return this.copy(this.squad);
  }

  public async transferCaptain(
    squadId: string,
    currentCaptainDiscordId: string,
    nextCaptainDiscordId: string,
  ) {
    if (
      !this.squad ||
      this.squad.id !== squadId ||
      this.squad.captainDiscordId !== currentCaptainDiscordId ||
      !this.squad.members.some(
        (member) => member.discordId === nextCaptainDiscordId,
      )
    ) {
      return null;
    }
    this.squad = {
      ...this.squad,
      captainDiscordId: nextCaptainDiscordId,
    };
    return this.copy(this.squad);
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
    if (!this.squad || this.squad.id !== squadId) {
      return null;
    }
    this.squad = {
      ...this.squad,
      founding: {
        ...this.squad.founding,
        status,
        ...(input.appliedAt !== undefined
          ? { appliedAt: input.appliedAt }
          : {}),
        ...(input.reviewedAt !== undefined
          ? { reviewedAt: input.reviewedAt }
          : {}),
        ...(input.reviewedByDiscordId !== undefined
          ? { reviewedByDiscordId: input.reviewedByDiscordId }
          : {}),
        ...(input.rejectionReason !== undefined
          ? { rejectionReason: input.rejectionReason }
          : {}),
      },
    };
    return this.copy(this.squad);
  }

  public async findFoundingApplications(guildId: string) {
    return this.squad?.guildId === guildId &&
      this.squad.founding.status === "applied"
      ? [this.copy(this.squad)]
      : [];
  }

  public async archive(
    squadId: string,
    captainDiscordId: string,
    archivedAt: Date,
  ) {
    if (
      !this.squad ||
      this.squad.id !== squadId ||
      this.squad.captainDiscordId !== captainDiscordId
    ) {
      return null;
    }
    const archived = this.copy(this.squad);
    this.squad = null;
    return { ...archived, updatedAt: archivedAt };
  }

  private copy(squad: CommunitySquadSummary): CommunitySquadSummary {
    return {
      ...squad,
      members: squad.members.map((member) => ({
        ...member,
        joinedAt: new Date(member.joinedAt),
      })),
      recruitingRoles: [...squad.recruitingRoles],
      founding: { ...squad.founding },
    };
  }
}

class MemorySquadPlayers {
  public readonly players = new Map<
    string,
    {
      discord: { id: string };
      game: { ign: string };
      rating: { rsr: number };
      verification: { status: string };
      preferences: {
        roles: { primary: PlayerRole; secondary: PlayerRole };
      };
    }
  >();

  public add(
    discordId: string,
    primary: PlayerRole,
    secondary: PlayerRole,
    verified = true,
  ) {
    this.players.set(discordId, {
      discord: { id: discordId },
      game: { ign: `Player ${discordId}` },
      rating: { rsr: 1_000 },
      verification: { status: verified ? "verified" : "pending" },
      preferences: { roles: { primary, secondary } },
    });
  }

  public async findByDiscordId(discordId: string) {
    return this.players.get(discordId) ?? null;
  }

  public async findByDiscordIds(discordIds: readonly string[]) {
    return discordIds.flatMap((id) => {
      const player = this.players.get(id);
      return player ? [player] : [];
    });
  }
}

function setup() {
  const repository = new MemoryCommunitySquads();
  const players = new MemorySquadPlayers();
  players.add("captain", "jungle", "mid");
  players.add("exp", "exp", "roam");
  players.add("gold", "gold", "mid");
  players.add("mid", "mid", "gold");
  players.add("roam", "roam", "exp");
  players.add("pending", "jungle", "mid", false);
  const service = new CommunitySquadService(
    repository,
    players,
    () => "A1B2C3D4",
  );
  return { repository, players, service };
}

describe("CommunitySquadService", () => {
  it("creates a normalized persistent roster for a verified captain", async () => {
    const { service } = setup();
    const dashboard = await service.create({
      guildId: "guild",
      captainDiscordId: "captain",
      name: "  Celestial   Five  ",
      tag: " c5 ",
      region: "eu",
      description: "  Calm ranked games.  ",
    });

    assert.equal(dashboard.name, "Celestial Five");
    assert.equal(dashboard.tag, "C5");
    assert.equal(dashboard.inviteCode, "A1B2C3D4");
    assert.equal(dashboard.roster[0]?.isCaptain, true);
    assert.deepEqual(dashboard.uncoveredRoles, ["exp", "gold", "roam"]);
  });

  it("requires account verification for creation and joining", async () => {
    const { service } = setup();
    await assert.rejects(
      () =>
        service.create({
          guildId: "guild",
          captainDiscordId: "pending",
          name: "Pending Team",
          region: "eu",
        }),
      /create and verify/i,
    );

    await service.create({
      guildId: "guild",
      captainDiscordId: "captain",
      name: "Verified Team",
      region: "eu",
    });
    await assert.rejects(
      () => service.join("guild", "pending", "A1B2-C3D4"),
      /create and verify/i,
    );
  });

  it("joins by friendly code and exposes live role coverage", async () => {
    const { service } = setup();
    await service.create({
      guildId: "guild",
      captainDiscordId: "captain",
      name: "Role Team",
      region: "eu",
    });
    const dashboard = await service.join("guild", "exp", "a1b2-c3d4");

    assert.equal(dashboard.roster.length, 2);
    assert.deepEqual(dashboard.uncoveredRoles, ["gold"]);
  });

  it("limits captain controls and supports safe captain transfer", async () => {
    const { service } = setup();
    await service.create({
      guildId: "guild",
      captainDiscordId: "captain",
      name: "Captain Team",
      region: "eu",
    });
    await service.join("guild", "exp", "A1B2C3D4");

    await assert.rejects(
      () => service.setRecruitingRoles("guild", "exp", ["gold"]),
      /only the squad captain/i,
    );
    const transferred = await service.transferCaptain(
      "guild",
      "captain",
      "exp",
    );
    assert.equal(transferred.captainDiscordId, "exp");
    await service.leave("guild", "captain");
    assert.equal(
      (await service.getDashboard("guild", "exp"))?.roster.length,
      1,
    );
  });

  it("opens Founding Squad applications only for complete rosters", async () => {
    const { service } = setup();
    await service.create({
      guildId: "guild",
      captainDiscordId: "captain",
      name: "Founding Team",
      region: "eu",
    });
    await assert.rejects(
      () => service.applyForFounding("guild", "captain"),
      /after 5 verified members/i,
    );
    for (const id of ["exp", "gold", "mid", "roam"]) {
      await service.join("guild", id, "A1B2C3D4");
    }
    const applied = await service.applyForFounding("guild", "captain");
    assert.equal(applied.founding.status, "applied");
    assert.equal(
      (await service.listFoundingApplications("guild")).length,
      1,
    );
    const approved = await service.reviewFoundingApplication(
      "guild",
      "A1B2-C3D4",
      "founding",
      "operations",
      null,
    );
    assert.equal(approved.founding.status, "founding");
  });

  it("rechecks every roster member before a Founding Squad application", async () => {
    const { service, players } = setup();
    await service.create({
      guildId: "guild",
      captainDiscordId: "captain",
      name: "Verified Founders",
      region: "eu",
    });
    for (const id of ["exp", "gold", "mid", "roam"]) {
      await service.join("guild", id, "A1B2C3D4");
    }
    const changedPlayer = players.players.get("roam");
    assert.ok(changedPlayer);
    changedPlayer.verification.status = "pending";

    await assert.rejects(
      () => service.applyForFounding("guild", "captain"),
      /every roster member must still have a verified/i,
    );
  });
});

describe("Community squad Discord UI", () => {
  it("publishes one simple player command and guided entry actions", () => {
    assert.equal(communitySquadCommandData.toJSON().name, "squad");
    const welcome = JSON.stringify(createCommunitySquadWelcomeView().toJSON());
    assert.match(welcome, /Create a Squad/);
    assert.match(welcome, /Join with Code/);

    const modal = JSON.stringify(createCommunitySquadProfileModal().toJSON());
    assert.match(modal, /Squad name/);
    assert.match(modal, /community:squad:input:region/);
  });

  it("keeps required scrim inputs before the optional squad name", () => {
    const create = scrimCommandData
      .toJSON()
      .options?.find((option) => option.name === "create");
    assert.ok(create && "options" in create);
    assert.deepEqual(
      create.options?.map((option) => [
        option.name,
        "required" in option ? option.required ?? false : false,
      ]),
      [
        ["region", true],
        ["availability", true],
        ["team", false],
        ["notes", false],
      ],
    );
  });

  it("keeps captain controls, invite code and roster in one dashboard", () => {
    const dashboard: CommunitySquadDashboard = {
      id: "507f1f77bcf86cd799439011",
      guildId: "guild",
      name: "Celestial Five",
      tag: "C5",
      description: "Ranked team",
      region: "eu",
      inviteCode: "A1B2C3D4",
      captainDiscordId: "captain",
      members: [{ discordId: "captain", joinedAt: new Date() }],
      recruitingRoles: ["gold"],
      founding: {
        status: "none",
        appliedAt: null,
        reviewedAt: null,
        reviewedByDiscordId: null,
        rejectionReason: null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      roster: [
        {
          discordId: "captain",
          ign: "Captain",
          rsr: 1_000,
          primaryRole: "jungle",
          secondaryRole: "mid",
          joinedAt: new Date(),
          isCaptain: true,
        },
      ],
      uncoveredRoles: ["exp", "gold", "roam"],
    };
    const json = JSON.stringify(
      createCommunitySquadDashboardView(dashboard, "captain").toJSON(),
    );
    assert.match(json, /A1B2-C3D4/);
    assert.match(json, /Manage Roster/);
    assert.match(json, /Apply as Founding Squad/);
  });
});
