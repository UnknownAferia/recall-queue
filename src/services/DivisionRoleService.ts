import type { Guild, GuildMember, Role } from "discord.js";

import { GuildBlueprint, type GuildRoleKey } from "../config/guildBlueprint.js";
import { logger } from "../config/logger.js";
import { DivisionResolver } from "../domain/rating/DivisionResolver.js";
import type { RankedDivision } from "../domain/rating/RankedDivision.js";
import type { PlayerRepository } from "../repositories/PlayerRepository.js";

export interface DivisionRolePlayer {
  readonly discord: { readonly id: string };
  readonly rating: { readonly rsr: number };
  readonly statistics: { readonly matchesPlayed: number };
}

export type DivisionRoleSyncResult =
  | "assigned"
  | "updated"
  | "removed-for-placement"
  | "already-synchronized"
  | "unavailable";

const DivisionRoleKeys: Readonly<Record<RankedDivision["key"], GuildRoleKey>> =
  Object.freeze({
    bronze: "divisionBronze",
    silver: "divisionSilver",
    gold: "divisionGold",
    platinum: "divisionPlatinum",
    diamond: "divisionDiamond",
    master: "divisionMaster",
    apex: "divisionApex",
  });

const ManagedDivisionRoleKeys = new Set<GuildRoleKey>(
  Object.values(DivisionRoleKeys),
);

export class DivisionRoleService {
  public constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly divisionResolver = new DivisionResolver(),
  ) {}

  public async synchronizeMember(
    member: GuildMember,
    player: DivisionRolePlayer,
  ): Promise<DivisionRoleSyncResult> {
    if (member.user.bot || member.user.id !== player.discord.id) {
      return "unavailable";
    }

    await this.ensureManagedRolesCached(member.guild);
    return this.applyMemberRoles(member, player);
  }

  public async synchronizeGuildMembers(
    guild: Guild,
    discordIds: readonly string[],
  ): Promise<void> {
    const uniqueDiscordIds = [...new Set(discordIds)];
    const players =
      await this.playerRepository.findByDiscordIds(uniqueDiscordIds);

    await this.ensureManagedRolesCached(guild);
    await Promise.all(
      players.map(async (player) => {
        const member = await guild.members
          .fetch(player.discord.id)
          .catch(() => null);

        if (member) {
          await this.applyMemberRoles(member, player);
        }
      }),
    );
  }

  private async ensureManagedRolesCached(guild: Guild): Promise<void> {
    const managedRoleNames = GuildBlueprint.roles
      .filter((role) => ManagedDivisionRoleKeys.has(role.key))
      .map((role) => role.name);
    const cacheIsComplete = managedRoleNames.every((name) =>
      guild.roles.cache.some((role) => role.name === name),
    );

    if (!cacheIsComplete) {
      await guild.roles.fetch();
    }
  }

  private async applyMemberRoles(
    member: GuildMember,
    player: DivisionRolePlayer,
  ): Promise<DivisionRoleSyncResult> {
    const standing = this.divisionResolver.resolve(
      player.rating.rsr,
      player.statistics.matchesPlayed,
    );
    const desiredKey =
      standing.state === "ranked"
        ? DivisionRoleKeys[standing.division.key]
        : null;
    const blueprints = GuildBlueprint.roles.filter((role) =>
      ManagedDivisionRoleKeys.has(role.key),
    );
    const blueprintNames = new Set(
      blueprints.map((blueprint) => blueprint.name),
    );
    const managedRoles = member.guild.roles.cache.filter((role) =>
      blueprintNames.has(role.name),
    );
    const desiredBlueprint = desiredKey
      ? blueprints.find((blueprint) => blueprint.key === desiredKey)
      : null;
    const desiredRole = desiredBlueprint
      ? managedRoles.find((role) => role.name === desiredBlueprint.name)
      : null;
    const currentRoles = member.roles.cache.filter((role) =>
      blueprintNames.has(role.name),
    );
    const rolesToRemove = currentRoles.filter(
      (role) => role.id !== desiredRole?.id && role.editable,
    );
    const hasUneditableStaleRole = currentRoles.some(
      (role) => role.id !== desiredRole?.id && !role.editable,
    );

    if (rolesToRemove.size > 0) {
      await member.roles.remove(
        [...rolesToRemove.values()],
        "Vora division synchronized",
      );
    }

    if (!desiredKey) {
      return rolesToRemove.size > 0
        ? "removed-for-placement"
        : "already-synchronized";
    }

    if (!desiredRole || !desiredRole.editable || hasUneditableStaleRole) {
      logger.warn(
        `Unable to synchronize division role for ${member.user.id} in guild ${member.guild.id}. Run /server-setup and verify the bot role hierarchy.`,
      );
      return "unavailable";
    }

    if (member.roles.cache.has(desiredRole.id)) {
      return rolesToRemove.size > 0 ? "updated" : "already-synchronized";
    }

    await member.roles.add(desiredRole, "Vora division synchronized");
    return rolesToRemove.size > 0 ? "updated" : "assigned";
  }
}
