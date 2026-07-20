import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GuildBlueprint } from "../src/config/guildBlueprint.js";
import {
  GuildSetupPlanner,
  type GuildSetupInventory,
} from "../src/domain/guildSetup/GuildSetupPlanner.js";
import { createServerSetupView } from "../src/ui/createServerSetupView.js";

const planner = new GuildSetupPlanner(GuildBlueprint);

function createEmptyInventory(): GuildSetupInventory {
  return {
    roleNames: new Set(),
    categories: new Set(),
    channels: [],
  };
}

function createCompleteInventory(): GuildSetupInventory {
  const categoryNames = new Map(
    GuildBlueprint.categories.map((category) => [
      category.key,
      category.name,
    ]),
  );

  return {
    roleNames: new Set(GuildBlueprint.roles.map((role) => role.name)),
    categories: new Set(
      GuildBlueprint.categories.map((category) => category.name),
    ),
    channels: GuildBlueprint.channels.map((channel) => ({
      name: channel.name,
      type: channel.type,
      parentName: categoryNames.get(channel.categoryKey) ?? null,
    })),
  };
}

function createLegacyInventory(): GuildSetupInventory {
  const categoryNames = new Map(
    GuildBlueprint.categories.map((category) => [
      category.key,
      category.legacyNames?.[0] ?? category.name,
    ]),
  );

  return {
    roleNames: new Set(
      GuildBlueprint.roles.map(
        (role) => role.legacyNames?.[0] ?? role.name,
      ),
    ),
    categories: new Set(categoryNames.values()),
    channels: GuildBlueprint.channels.map((channel) => ({
      name: channel.legacyNames?.[0] ?? channel.name,
      type: channel.type,
      parentName: categoryNames.get(channel.categoryKey) ?? null,
    })),
  };
}

describe("Guild setup", () => {
  it("uses unique stable keys and Discord resource names", () => {
    assert.equal(
      new Set(GuildBlueprint.roles.map((role) => role.key)).size,
      GuildBlueprint.roles.length,
    );
    assert.equal(
      new Set(GuildBlueprint.roles.map((role) => role.name)).size,
      GuildBlueprint.roles.length,
    );
    assert.equal(
      new Set(GuildBlueprint.categories.map((category) => category.key)).size,
      GuildBlueprint.categories.length,
    );
    assert.equal(
      new Set(GuildBlueprint.channels.map((channel) => channel.key)).size,
      GuildBlueprint.channels.length,
    );
  });

  it("plans every blueprint resource for an empty server", () => {
    const plan = planner.createPlan(createEmptyInventory());

    assert.equal(plan.rolesToCreate.length, GuildBlueprint.roles.length);
    assert.equal(
      plan.categoriesToCreate.length,
      GuildBlueprint.categories.length,
    );
    assert.equal(plan.channelsToCreate.length, GuildBlueprint.channels.length);
    assert.equal(plan.renamesRequired.length, 0);
    assert.equal(plan.isComplete, false);
    assert.doesNotThrow(() =>
      createServerSetupView("Vora Test", plan).toJSON(),
    );
  });

  it("is idempotent when the complete blueprint already exists", () => {
    const plan = planner.createPlan(createCompleteInventory());

    assert.equal(plan.rolesToCreate.length, 0);
    assert.equal(plan.categoriesToCreate.length, 0);
    assert.equal(plan.channelsToCreate.length, 0);
    assert.equal(plan.renamesRequired.length, 0);
    assert.equal(plan.isComplete, true);
    assert.doesNotThrow(() =>
      createServerSetupView("Vora Test", plan, true).toJSON(),
    );
  });

  it("migrates legacy RecallQ resources instead of creating duplicates", () => {
    const plan = planner.createPlan(createLegacyInventory());

    assert.equal(plan.rolesToCreate.length, 0);
    assert.equal(plan.categoriesToCreate.length, 0);
    assert.equal(plan.channelsToCreate.length, 0);
    assert.equal(plan.renamesRequired.length, 5);
    assert.equal(plan.isComplete, false);
    assert.deepEqual(
      plan.renamesRequired.map((rename) => rename.name),
      [
        "Vora Admin",
        GuildBlueprint.categories.find((category) => category.key === "vora")!
          .name,
        GuildBlueprint.channels.find(
          (channel) => channel.key === "howVoraWorks",
        )!.name,
        GuildBlueprint.channels.find(
          (channel) => channel.key === "voraCommands",
        )!.name,
        GuildBlueprint.channels.find((channel) => channel.key === "voraLog")!
          .name,
      ],
    );
    assert.doesNotThrow(() =>
      createServerSetupView("Vora Test", plan).toJSON(),
    );
  });

  it("recreates a channel only when it is outside its blueprint category", () => {
    const inventory = createCompleteInventory();
    const firstChannel = inventory.channels[0]!;

    const plan = planner.createPlan({
      ...inventory,
      channels: [
        {
          ...firstChannel,
          parentName: "OLD SERVER CATEGORY",
        },
        ...inventory.channels.slice(1),
      ],
    });

    assert.deepEqual(
      plan.channelsToCreate.map((channel) => channel.key),
      [GuildBlueprint.channels[0]!.key],
    );
  });
});
