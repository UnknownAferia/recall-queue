import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  Collection,
  type Guild,
  type GuildMember,
  type Role,
} from "discord.js";
import { Types } from "mongoose";

import { GuildBlueprint } from "../src/config/guildBlueprint.js";
import type { SeasonRepository } from "../src/repositories/SeasonRepository.js";
import { SeasonRewardRoleService } from "../src/services/SeasonRewardRoleService.js";

const RewardRoleNames = GuildBlueprint.roles
  .filter((role) => role.key.startsWith("season"))
  .map((role) => role.name);

function createGuild(
  currentRolesByMember: Readonly<Record<string, readonly string[]>>,
  omittedRoleName?: string,
): {
  readonly guild: Guild;
  readonly rolesFor: (discordId: string) => string[];
} {
  const guildRoles = new Collection<string, Role>();
  const members = new Collection<string, GuildMember>();

  for (const [index, name] of RewardRoleNames.entries()) {
    if (name === omittedRoleName) {
      continue;
    }

    const role = {
      id: `reward-${index}`,
      name,
      editable: true,
    } as Role;
    guildRoles.set(role.id, role);
  }

  for (const [discordId, roleNames] of Object.entries(currentRolesByMember)) {
    const memberRoles = new Collection<string, Role>();

    for (const role of guildRoles.values()) {
      if (roleNames.includes(role.name)) {
        memberRoles.set(role.id, role);
      }
    }

    const member = {
      id: discordId,
      user: { id: discordId, bot: false },
      roles: {
        cache: memberRoles,
        add: async (roleIds: readonly string[]) => {
          for (const roleId of roleIds) {
            const role = guildRoles.get(roleId);
            if (role) memberRoles.set(role.id, role);
          }
        },
        remove: async (roleIds: readonly string[]) => {
          for (const roleId of roleIds) memberRoles.delete(roleId);
        },
      },
    } as unknown as GuildMember;
    members.set(discordId, member);
  }

  const guild = {
    id: "guild-id",
    roles: { cache: guildRoles },
    members: { fetch: async () => members },
  } as unknown as Guild;

  return {
    guild,
    rolesFor: (discordId) =>
      [...members.get(discordId)!.roles.cache.values()].map(
        (role) => role.name,
      ),
  };
}

describe("Season reward roles", () => {
  it("replaces obsolete rewards with achievements from the completed season", async () => {
    const fixture = createGuild({
      champion: ["Season Top 10"],
      unranked: ["Season Veteran"],
    });
    const repository = {
      findRewardRecipients: async () => [
        {
          discordId: "champion",
          achievements: ["champion", "veteran"],
        },
      ],
    } as unknown as SeasonRepository;
    const service = new SeasonRewardRoleService(repository);

    const result = await service.synchronize(
      [fixture.guild],
      new Types.ObjectId().toString(),
    );

    assert.deepEqual(fixture.rolesFor("champion").sort(), [
      "Season Champion",
      "Season Veteran",
    ]);
    assert.deepEqual(fixture.rolesFor("unranked"), []);
    assert.deepEqual(result, {
      guildsProcessed: 1,
      membersChanged: 2,
      guildsSkipped: 0,
    });
  });

  it("skips a guild safely when its managed reward roles are incomplete", async () => {
    const fixture = createGuild({ player: [] }, "Season Champion");
    const repository = {
      findRewardRecipients: async () => [],
    } as unknown as SeasonRepository;
    const service = new SeasonRewardRoleService(repository);

    const result = await service.synchronize(
      [fixture.guild],
      new Types.ObjectId().toString(),
    );

    assert.deepEqual(result, {
      guildsProcessed: 0,
      membersChanged: 0,
      guildsSkipped: 1,
    });
  });
});
