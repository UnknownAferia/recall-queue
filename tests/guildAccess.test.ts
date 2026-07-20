import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Collection, type GuildMember, type Role } from "discord.js";

import { GuildAccessService } from "../src/services/GuildAccessService.js";

function createMember(roleAvailable: boolean): {
  member: GuildMember;
  getAssignments: () => number;
} {
  const role = {
    id: "verified-role-id",
    name: "Verified Player",
    editable: true,
  } as Role;

  const guildRoles = new Collection<string, Role>();
  const memberRoles = new Collection<string, Role>();
  let assignments = 0;

  if (roleAvailable) {
    guildRoles.set(role.id, role);
  }

  const member = {
    user: {
      id: "player-id",
      bot: false,
    },
    guild: {
      id: "guild-id",
      roles: {
        cache: guildRoles,
        fetch: async () => guildRoles,
      },
    },
    roles: {
      cache: memberRoles,
      add: async (assignedRole: Role) => {
        assignments += 1;
        memberRoles.set(assignedRole.id, assignedRole);
      },
    },
  } as unknown as GuildMember;

  return {
    member,
    getAssignments: () => assignments,
  };
}

describe("GuildAccessService", () => {
  it("assigns Verified Player exactly once", async () => {
    const fixture = createMember(true);
    const service = new GuildAccessService();

    assert.equal(
      await service.ensureVerifiedPlayerRole(fixture.member),
      "assigned",
    );
    assert.equal(
      await service.ensureVerifiedPlayerRole(fixture.member),
      "already-assigned",
    );
    assert.equal(fixture.getAssignments(), 1);
  });

  it("keeps registration usable when the managed role is unavailable", async () => {
    const fixture = createMember(false);
    const service = new GuildAccessService();

    assert.equal(
      await service.ensureVerifiedPlayerRole(fixture.member),
      "unavailable",
    );
    assert.equal(fixture.getAssignments(), 0);
  });
});
