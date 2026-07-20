import { GuildBlueprint } from "../../config/guildBlueprint.js";

type Blueprint = typeof GuildBlueprint;

export interface ExistingGuildChannel {
  readonly name: string;
  readonly type: number;
  readonly parentName: string | null;
}

export interface GuildSetupInventory {
  readonly roleNames: ReadonlySet<string>;
  readonly categories: ReadonlySet<string>;
  readonly channels: readonly ExistingGuildChannel[];
}

export interface GuildSetupPlan {
  readonly blueprintVersion: number;
  readonly rolesToCreate: Blueprint["roles"];
  readonly categoriesToCreate: Blueprint["categories"];
  readonly channelsToCreate: Blueprint["channels"];
  readonly renamesRequired: readonly GuildSetupRename[];
  readonly repairsRequired: readonly GuildSetupRepair[];
  readonly isComplete: boolean;
}

export interface GuildSetupRename {
  readonly kind: "role" | "category" | "channel";
  readonly key: string;
  readonly currentName: string;
  readonly name: string;
}

export interface GuildSetupRepair {
  readonly kind: "role" | "category" | "channel";
  readonly name: string;
}

export class GuildSetupPlanner {
  public constructor(private readonly blueprint: Blueprint) {}

  public createPlan(inventory: GuildSetupInventory): GuildSetupPlan {
    const rolesToCreate = this.blueprint.roles.filter(
      (role) =>
        !this.namesFor(role).some((name) => inventory.roleNames.has(name)),
    );

    const categoriesToCreate = this.blueprint.categories.filter(
      (category) =>
        !this.namesFor(category).some((name) =>
          inventory.categories.has(name),
        ),
    );

    const channelsToCreate = this.blueprint.channels.filter((channel) => {
      const parentBlueprint = this.blueprint.categories.find(
        (category) => category.key === channel.categoryKey,
      );
      const expectedParentNames = parentBlueprint
        ? this.namesFor(parentBlueprint)
        : [];
      const channelNames = this.namesFor(channel);

      return !inventory.channels.some(
        (existingChannel) =>
          channelNames.includes(existingChannel.name) &&
          existingChannel.type === channel.type &&
          existingChannel.parentName !== null &&
          expectedParentNames.includes(existingChannel.parentName),
      );
    });
    const renamesRequired: GuildSetupRename[] = [];

    for (const role of this.blueprint.roles) {
      const currentName = role.legacyNames?.find((name) =>
        inventory.roleNames.has(name),
      );

      if (!inventory.roleNames.has(role.name) && currentName) {
        renamesRequired.push({
          kind: "role",
          key: role.key,
          currentName,
          name: role.name,
        });
      }
    }

    for (const category of this.blueprint.categories) {
      const currentName = category.legacyNames?.find((name) =>
        inventory.categories.has(name),
      );

      if (!inventory.categories.has(category.name) && currentName) {
        renamesRequired.push({
          kind: "category",
          key: category.key,
          currentName,
          name: category.name,
        });
      }
    }

    for (const channel of this.blueprint.channels) {
      const parentBlueprint = this.blueprint.categories.find(
        (category) => category.key === channel.categoryKey,
      );
      const parentNames = parentBlueprint
        ? this.namesFor(parentBlueprint)
        : [];
      const currentName = channel.legacyNames?.find((name) =>
        inventory.channels.some(
          (existingChannel) =>
            existingChannel.name === name &&
            existingChannel.type === channel.type &&
            existingChannel.parentName !== null &&
            parentNames.includes(existingChannel.parentName),
        ),
      );
      const targetExists = inventory.channels.some(
        (existingChannel) =>
          existingChannel.name === channel.name &&
          existingChannel.type === channel.type &&
          existingChannel.parentName !== null &&
          parentNames.includes(existingChannel.parentName),
      );

      if (!targetExists && currentName) {
        renamesRequired.push({
          kind: "channel",
          key: channel.key,
          currentName,
          name: channel.name,
        });
      }
    }

    return {
      blueprintVersion: this.blueprint.version,
      rolesToCreate,
      categoriesToCreate,
      channelsToCreate,
      renamesRequired,
      repairsRequired: [],
      isComplete:
        rolesToCreate.length === 0 &&
        categoriesToCreate.length === 0 &&
        channelsToCreate.length === 0 &&
        renamesRequired.length === 0,
    };
  }

  private namesFor(resource: {
    readonly name: string;
    readonly legacyNames?: readonly string[];
  }): readonly string[] {
    return [resource.name, ...(resource.legacyNames ?? [])];
  }
}
