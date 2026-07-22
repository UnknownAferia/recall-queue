import { isValidObjectId, Types } from "mongoose";
import type { Guild, GuildMember, Role } from "discord.js";

import { GuildBlueprint, type GuildRoleKey } from "../config/guildBlueprint.js";
import { logger } from "../config/logger.js";
import type { SeasonAchievement } from "../constants/season.js";
import type { SeasonRepository } from "../repositories/SeasonRepository.js";

const AchievementRoleKeys: Readonly<Record<SeasonAchievement, GuildRoleKey>> = {
  champion: "seasonChampion",
  topTen: "seasonElite",
  veteran: "seasonVeteran",
};

const RewardRoleKeys = new Set<GuildRoleKey>(
  Object.values(AchievementRoleKeys),
);

export interface SeasonRewardSyncResult {
  readonly guildsProcessed: number;
  readonly membersChanged: number;
  readonly guildsSkipped: number;
}

export class SeasonRewardRoleService {
  public constructor(private readonly seasons: SeasonRepository) {}

  public async synchronize(
    guilds: Iterable<Guild>,
    seasonId: string,
  ): Promise<SeasonRewardSyncResult> {
    if (!isValidObjectId(seasonId)) {
      throw new Error("Invalid season ID for reward synchronization.");
    }

    const recipients = await this.seasons.findRewardRecipients(
      new Types.ObjectId(seasonId),
    );
    const desiredByDiscordId = new Map(
      recipients.map((recipient) => [
        recipient.discordId,
        new Set(
          recipient.achievements.map(
            (achievement) => AchievementRoleKeys[achievement],
          ),
        ),
      ]),
    );
    let guildsProcessed = 0;
    let guildsSkipped = 0;
    let membersChanged = 0;

    for (const guild of guilds) {
      try {
        const rolesByKey = this.resolveRewardRoles(guild);

        if (!rolesByKey) {
          guildsSkipped += 1;
          logger.warn(
            `Season reward roles are incomplete in guild ${guild.id}. Run /server-setup before synchronizing rewards.`,
          );
          continue;
        }

        const members = await guild.members.fetch();

        for (const member of members.values()) {
          if (member.user.bot) {
            continue;
          }

          const changed = await this.synchronizeMember(
            member,
            rolesByKey,
            desiredByDiscordId.get(member.id) ?? new Set<GuildRoleKey>(),
          );

          if (changed) {
            membersChanged += 1;
          }
        }

        guildsProcessed += 1;
      } catch (error: unknown) {
        guildsSkipped += 1;
        logger.warn(
          `Season reward synchronization failed in guild ${guild.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return { guildsProcessed, membersChanged, guildsSkipped };
  }

  private resolveRewardRoles(guild: Guild): Map<GuildRoleKey, Role> | null {
    const roles = new Map<GuildRoleKey, Role>();

    for (const blueprint of GuildBlueprint.roles) {
      if (!RewardRoleKeys.has(blueprint.key)) {
        continue;
      }

      const role = guild.roles.cache.find(
        (candidate) => candidate.name === blueprint.name,
      );

      if (!role || !role.editable) {
        return null;
      }

      roles.set(blueprint.key, role);
    }

    return roles;
  }

  private async synchronizeMember(
    member: GuildMember,
    rolesByKey: ReadonlyMap<GuildRoleKey, Role>,
    desiredKeys: ReadonlySet<GuildRoleKey>,
  ): Promise<boolean> {
    const desiredRoleIds = new Set(
      [...desiredKeys]
        .map((key) => rolesByKey.get(key)?.id)
        .filter((roleId): roleId is string => Boolean(roleId)),
    );
    const managedRoleIds = new Set(
      [...rolesByKey.values()].map((role) => role.id),
    );
    const toRemove = member.roles.cache
      .filter(
        (role) => managedRoleIds.has(role.id) && !desiredRoleIds.has(role.id),
      )
      .map((role) => role.id);
    const toAdd = [...desiredRoleIds].filter(
      (roleId) => !member.roles.cache.has(roleId),
    );

    if (toRemove.length > 0) {
      await member.roles.remove(toRemove, "Vora season rewards synchronized");
    }

    if (toAdd.length > 0) {
      await member.roles.add(toAdd, "Vora season rewards synchronized");
    }

    return toRemove.length > 0 || toAdd.length > 0;
  }
}
