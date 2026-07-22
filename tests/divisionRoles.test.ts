import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Collection, type GuildMember, type Role } from "discord.js";

import { GuildBlueprint } from "../src/config/guildBlueprint.js";
import type { PlayerRepository } from "../src/repositories/PlayerRepository.js";
import {
  DivisionRoleService,
  type DivisionRolePlayer,
} from "../src/services/DivisionRoleService.js";

const DivisionRoleNames = GuildBlueprint.roles
  .filter((role) => role.key.startsWith("division"))
  .map((role) => role.name);

function createPlayer(rsr: number, matchesPlayed: number): DivisionRolePlayer {
  return {
    discord: { id: "player-id" },
    rating: { rsr },
    statistics: { matchesPlayed },
  };
}

function createFixture(
  currentRoleNames: readonly string[],
  unavailableRoleName?: string,
): {
  member: GuildMember;
  currentRoleNames: () => string[];
} {
  const guildRoles = new Collection<string, Role>();
  const memberRoles = new Collection<string, Role>();

  for (const [index, name] of DivisionRoleNames.entries()) {
    if (name === unavailableRoleName) {
      continue;
    }

    const role = {
      id: `division-role-${index}`,
      name,
      editable: true,
    } as Role;
    guildRoles.set(role.id, role);

    if (currentRoleNames.includes(name)) {
      memberRoles.set(role.id, role);
    }
  }

  const member = {
    user: { id: "player-id", bot: false },
    guild: {
      id: "guild-id",
      roles: {
        cache: guildRoles,
        fetch: async () => guildRoles,
      },
    },
    roles: {
      cache: memberRoles,
      add: async (role: Role) => {
        memberRoles.set(role.id, role);
      },
      remove: async (roles: Role[]) => {
        for (const role of roles) {
          memberRoles.delete(role.id);
        }
      },
    },
  } as unknown as GuildMember;

  return {
    member,
    currentRoleNames: () => [...memberRoles.values()].map((role) => role.name),
  };
}

describe("DivisionRoleService", () => {
  const service = new DivisionRoleService({} as PlayerRepository);

  it("removes division roles while a player is in placement", async () => {
    const fixture = createFixture(["Vora Gold"]);

    assert.equal(
      await service.synchronizeMember(fixture.member, createPlayer(1_200, 9)),
      "removed-for-placement",
    );
    assert.deepEqual(fixture.currentRoleNames(), []);
  });

  it("replaces an outdated division role with the current division", async () => {
    const fixture = createFixture(["Vora Silver"]);

    assert.equal(
      await service.synchronizeMember(fixture.member, createPlayer(1_100, 10)),
      "updated",
    );
    assert.deepEqual(fixture.currentRoleNames(), ["Vora Gold"]);
  });

  it("keeps exactly one already-correct division role", async () => {
    const fixture = createFixture(["Vora Diamond"]);

    assert.equal(
      await service.synchronizeMember(fixture.member, createPlayer(1_600, 30)),
      "already-synchronized",
    );
    assert.deepEqual(fixture.currentRoleNames(), ["Vora Diamond"]);
  });

  it("fails safely when the required managed role is unavailable", async () => {
    const fixture = createFixture(["Vora Silver"], "Vora Gold");

    assert.equal(
      await service.synchronizeMember(fixture.member, createPlayer(1_100, 10)),
      "unavailable",
    );
    assert.deepEqual(fixture.currentRoleNames(), []);
  });
});
