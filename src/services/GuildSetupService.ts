import {
  ChannelType,
  PermissionFlagsBits,
  type Guild,
  type NonThreadGuildBasedChannel,
  type Role,
} from "discord.js";

import {
  GuildBlueprint,
  type GuildCategoryBlueprint,
  type GuildChannelAccess,
  type GuildChannelBlueprint,
  type GuildRoleKey,
} from "../config/guildBlueprint.js";
import { logger } from "../config/logger.js";
import {
  GuildSetupPlanner,
  type GuildSetupInventory,
  type GuildSetupPlan,
  type GuildSetupRename,
  type GuildSetupRepair,
} from "../domain/guildSetup/GuildSetupPlanner.js";
import {
  combinePermissions,
  permissionOverwriteMatches,
  type ManagedPermissionOverwrite,
} from "../domain/guildSetup/permissionPolicy.js";

const SetupReason = "Vora server blueprint synchronization";

const StaffRoleKeys: readonly GuildRoleKey[] = [
  "administrator",
  "moderator",
  "developer",
];

export class GuildSetupService {
  public constructor(
    private readonly planner = new GuildSetupPlanner(GuildBlueprint),
  ) {}

  public async createPlan(guild: Guild): Promise<GuildSetupPlan> {
    await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);

    const basePlan = this.planner.createPlan(this.createInventory(guild));
    const repairsRequired = this.findRepairs(guild, basePlan);

    return {
      ...basePlan,
      repairsRequired,
      isComplete: basePlan.isComplete && repairsRequired.length === 0,
    };
  }

  public async apply(guild: Guild): Promise<GuildSetupPlan> {
    const preview = await this.createPlan(guild);

    await this.migrateLegacyResources(guild, preview.renamesRequired);

    const plan = await this.createPlan(guild);

    for (const role of plan.rolesToCreate) {
      await guild.roles.create({
        name: role.name,
        color: role.color,
        permissions: role.permissions,
        hoist: role.hoist,
        mentionable: false,
        reason: SetupReason,
      });

      logger.info(`Created Vora role ${role.name} in guild ${guild.id}.`);
    }

    const rolesByKey = this.resolveRoles(guild);

    for (const category of plan.categoriesToCreate) {
      await guild.channels.create({
        name: category.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: this.createPermissionOverwrites(
          guild,
          rolesByKey,
          category.access,
        ),
        reason: SetupReason,
      });

      logger.info(
        `Created Vora category ${category.name} in guild ${guild.id}.`,
      );
    }

    for (const channel of plan.channelsToCreate) {
      const categoryName = GuildBlueprint.categories.find(
        (candidate) => candidate.key === channel.categoryKey,
      )?.name;

      const category = categoryName
        ? this.resolveCategory(guild, categoryName)
        : undefined;

      if (!category) {
        throw new Error(
          `Unable to resolve category ${channel.categoryKey} while creating ${channel.name}.`,
        );
      }

      const permissionOverwrites = this.createPermissionOverwrites(
        guild,
        rolesByKey,
        channel.access,
      );

      if (channel.type === ChannelType.GuildVoice) {
        await guild.channels.create({
          name: channel.name,
          type: ChannelType.GuildVoice,
          parent: category.id,
          permissionOverwrites,
          reason: SetupReason,
        });
      } else {
        await guild.channels.create({
          name: channel.name,
          type: ChannelType.GuildText,
          parent: category.id,
          topic: channel.topic,
          permissionOverwrites,
          reason: SetupReason,
        });
      }

      logger.info(`Created Vora channel ${channel.name} in guild ${guild.id}.`);
    }

    await this.repairManagedResources(guild);

    return this.createPlan(guild);
  }

  private createInventory(guild: Guild): GuildSetupInventory {
    const roleNames = new Set(guild.roles.cache.map((role) => role.name));

    const categories = new Set(
      guild.channels.cache
        .filter((channel) => channel.type === ChannelType.GuildCategory)
        .map((channel) => channel.name),
    );

    const channels = guild.channels.cache
      .filter((channel) => channel.type !== ChannelType.GuildCategory)
      .map((channel) => ({
        name: channel.name,
        type: channel.type,
        parentName: channel.parent?.name ?? null,
      }));

    return {
      roleNames,
      categories,
      channels,
    };
  }

  private findRepairs(guild: Guild, plan: GuildSetupPlan): GuildSetupRepair[] {
    const repairs: GuildSetupRepair[] = [];

    for (const roleBlueprint of GuildBlueprint.roles) {
      const role = guild.roles.cache.find(
        (candidate) => candidate.name === roleBlueprint.name,
      );

      if (
        role &&
        (role.permissions.bitfield !==
          combinePermissions(roleBlueprint.permissions) ||
          role.color !== roleBlueprint.color ||
          role.hoist !== roleBlueprint.hoist ||
          role.mentionable)
      ) {
        repairs.push({
          kind: "role",
          name: roleBlueprint.name,
        });
      }
    }

    if (plan.rolesToCreate.length > 0) {
      return repairs;
    }

    const rolesByKey = this.resolveRoles(guild);

    for (const categoryBlueprint of GuildBlueprint.categories) {
      const category = this.resolveCategory(guild, categoryBlueprint.name);

      if (
        category &&
        this.permissionsRequireRepair(
          category,
          this.createPermissionOverwrites(
            guild,
            rolesByKey,
            categoryBlueprint.access,
          ),
        )
      ) {
        repairs.push({
          kind: "category",
          name: categoryBlueprint.name,
        });
      }
    }

    for (const channelBlueprint of GuildBlueprint.channels) {
      const channel = this.resolveBlueprintChannel(guild, channelBlueprint);

      if (
        channel &&
        (this.permissionsRequireRepair(
          channel,
          this.createPermissionOverwrites(
            guild,
            rolesByKey,
            channelBlueprint.access,
          ),
        ) ||
          (channel.type === ChannelType.GuildText &&
            channelBlueprint.topic !== undefined &&
            channel.topic !== channelBlueprint.topic))
      ) {
        repairs.push({
          kind: "channel",
          name: channelBlueprint.name,
        });
      }
    }

    return repairs;
  }

  private async repairManagedResources(guild: Guild): Promise<void> {
    const plan = await this.createPlan(guild);
    const repairKeys = new Set(
      plan.repairsRequired.map((repair) => `${repair.kind}:${repair.name}`),
    );

    for (const roleBlueprint of GuildBlueprint.roles) {
      if (!repairKeys.has(`role:${roleBlueprint.name}`)) {
        continue;
      }

      const role = guild.roles.cache.find(
        (candidate) => candidate.name === roleBlueprint.name,
      );

      if (!role?.editable) {
        throw new Error(
          `Vora cannot repair role ${roleBlueprint.name}. Check the bot role hierarchy.`,
        );
      }

      await role.edit({
        color: roleBlueprint.color,
        permissions: roleBlueprint.permissions,
        hoist: roleBlueprint.hoist,
        mentionable: false,
        reason: SetupReason,
      });

      logger.info(
        `Repaired Vora role ${roleBlueprint.name} in guild ${guild.id}.`,
      );
    }

    const rolesByKey = this.resolveRoles(guild);

    for (const categoryBlueprint of GuildBlueprint.categories) {
      if (!repairKeys.has(`category:${categoryBlueprint.name}`)) {
        continue;
      }

      const category = this.resolveCategory(guild, categoryBlueprint.name);

      if (category) {
        await this.synchronizePermissionOverwrites(
          category,
          this.createPermissionOverwrites(
            guild,
            rolesByKey,
            categoryBlueprint.access,
          ),
        );
      }
    }

    for (const channelBlueprint of GuildBlueprint.channels) {
      if (!repairKeys.has(`channel:${channelBlueprint.name}`)) {
        continue;
      }

      const channel = this.resolveBlueprintChannel(guild, channelBlueprint);

      if (channel) {
        await this.synchronizePermissionOverwrites(
          channel,
          this.createPermissionOverwrites(
            guild,
            rolesByKey,
            channelBlueprint.access,
          ),
        );

        if (
          channel.type === ChannelType.GuildText &&
          channelBlueprint.topic !== undefined &&
          channel.topic !== channelBlueprint.topic
        ) {
          await channel.edit({
            topic: channelBlueprint.topic,
            reason: SetupReason,
          });
        }
      }
    }
  }

  private async migrateLegacyResources(
    guild: Guild,
    renames: readonly GuildSetupRename[],
  ): Promise<void> {
    for (const rename of renames.filter((entry) => entry.kind === "role")) {
      const role = guild.roles.cache.find(
        (candidate) => candidate.name === rename.currentName,
      );

      if (!role?.editable) {
        throw new Error(
          `Vora cannot rename role ${rename.currentName}. Check the bot role hierarchy.`,
        );
      }

      await role.edit({ name: rename.name, reason: SetupReason });
      logger.info(
        `Renamed role ${rename.currentName} to ${rename.name} in guild ${guild.id}.`,
      );
    }

    for (const rename of renames.filter((entry) => entry.kind === "category")) {
      const category = this.resolveCategory(guild, rename.currentName);

      if (!category) {
        throw new Error(`Unable to rename category ${rename.currentName}.`);
      }

      await category.edit({ name: rename.name, reason: SetupReason });
      logger.info(
        `Renamed category ${rename.currentName} to ${rename.name} in guild ${guild.id}.`,
      );
    }

    for (const rename of renames.filter((entry) => entry.kind === "channel")) {
      const blueprint = GuildBlueprint.channels.find(
        (channel) => channel.key === rename.key,
      );
      const categoryBlueprint = GuildBlueprint.categories.find(
        (category) => category.key === blueprint?.categoryKey,
      );
      const parentNames = categoryBlueprint
        ? [categoryBlueprint.name, ...(categoryBlueprint.legacyNames ?? [])]
        : [];
      const channel = guild.channels.cache.find(
        (candidate) =>
          candidate.type === blueprint?.type &&
          candidate.name === rename.currentName &&
          candidate.parent?.name !== undefined &&
          parentNames.includes(candidate.parent.name),
      );

      if (!channel || channel.type === ChannelType.GuildCategory) {
        throw new Error(`Unable to rename channel ${rename.currentName}.`);
      }

      await channel.edit({ name: rename.name, reason: SetupReason });
      logger.info(
        `Renamed channel ${rename.currentName} to ${rename.name} in guild ${guild.id}.`,
      );
    }
  }

  private resolveRoles(guild: Guild): ReadonlyMap<GuildRoleKey, Role> {
    const roles = new Map<GuildRoleKey, Role>();

    for (const roleBlueprint of GuildBlueprint.roles) {
      const role = guild.roles.cache.find(
        (candidate) => candidate.name === roleBlueprint.name,
      );

      if (role) {
        roles.set(roleBlueprint.key, role);
      }
    }

    return roles;
  }

  private resolveCategory(
    guild: Guild,
    name: string,
  ): NonThreadGuildBasedChannel | undefined {
    return guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory && channel.name === name,
    ) as NonThreadGuildBasedChannel | undefined;
  }

  private resolveBlueprintChannel(
    guild: Guild,
    blueprint: GuildChannelBlueprint,
  ): NonThreadGuildBasedChannel | undefined {
    const categoryName = GuildBlueprint.categories.find(
      (category) => category.key === blueprint.categoryKey,
    )?.name;

    return guild.channels.cache.find(
      (channel) =>
        channel.type === blueprint.type &&
        channel.name === blueprint.name &&
        channel.parent?.name === categoryName,
    ) as NonThreadGuildBasedChannel | undefined;
  }

  private permissionsRequireRepair(
    channel: NonThreadGuildBasedChannel,
    expected: readonly ManagedPermissionOverwrite[],
  ): boolean {
    return expected.some((overwrite) => {
      const actual = channel.permissionOverwrites.cache.get(overwrite.id);

      return !permissionOverwriteMatches(
        actual
          ? {
              allow: actual.allow.bitfield,
              deny: actual.deny.bitfield,
            }
          : undefined,
        overwrite,
      );
    });
  }

  private async synchronizePermissionOverwrites(
    channel: NonThreadGuildBasedChannel,
    expected: readonly ManagedPermissionOverwrite[],
  ): Promise<void> {
    const managedIds = new Set(expected.map((overwrite) => overwrite.id));

    const preserved = channel.permissionOverwrites.cache
      .filter((overwrite) => !managedIds.has(overwrite.id))
      .map((overwrite) => ({
        id: overwrite.id,
        type: overwrite.type,
        allow: overwrite.allow,
        deny: overwrite.deny,
      }));

    await channel.permissionOverwrites.set(
      [...preserved, ...expected],
      SetupReason,
    );

    logger.info(
      `Repaired permissions for ${channel.name} in guild ${channel.guild.id}.`,
    );
  }

  private createPermissionOverwrites(
    guild: Guild,
    rolesByKey: ReadonlyMap<GuildRoleKey, Role>,
    access: GuildChannelAccess,
  ): ManagedPermissionOverwrite[] {
    const overwrites: ManagedPermissionOverwrite[] = [];
    const everyoneId = guild.roles.everyone.id;

    if (access === "publicReadOnly") {
      overwrites.push({
        id: everyoneId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
        ],
        deny: [PermissionFlagsBits.SendMessages],
      });
    }

    if (access === "publicChat") {
      overwrites.push({
        id: everyoneId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
        deny: [],
      });
    }

    if (access === "verifiedChat") {
      overwrites.push({
        id: everyoneId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
        ],
        deny: [PermissionFlagsBits.SendMessages],
      });

      const verifiedRole = rolesByKey.get("verifiedPlayer");

      if (verifiedRole) {
        overwrites.push({
          id: verifiedRole.id,
          allow: [
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
          deny: [],
        });
      }
    }

    if (access === "publicVoice") {
      overwrites.push({
        id: everyoneId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
        ],
        deny: [],
      });
    }

    if (access === "staffOnly") {
      overwrites.push({
        id: everyoneId,
        allow: [],
        deny: [PermissionFlagsBits.ViewChannel],
      });
    }

    for (const roleKey of StaffRoleKeys) {
      const staffRole = rolesByKey.get(roleKey);

      if (!staffRole) {
        continue;
      }

      overwrites.push({
        id: staffRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.ManageMessages,
        ],
        deny: [],
      });
    }

    return overwrites;
  }
}
