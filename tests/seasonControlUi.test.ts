import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CustomIds,
  parseSeasonLifecycleCustomId,
} from "../src/constants/customIds.js";
import type { SeasonControlStateDto, SeasonDto } from "../src/dto/SeasonDto.js";
import { createSeasonControlView } from "../src/ui/createSeasonControlView.js";
import { createSeasonLifecycleConfirmationView } from "../src/ui/createSeasonLifecycleConfirmationView.js";
import { createSeasonModal } from "../src/ui/createSeasonModal.js";

const now = new Date("2026-07-22T12:00:00.000Z");

function createSeason(status: "scheduled" | "active" | "completed"): SeasonDto {
  return {
    id: "507f1f77bcf86cd799439011",
    sequence: 1,
    name: "Alpha Season",
    slug: "alpha-season",
    status,
    startsAt: new Date("2026-07-01T00:00:00.000Z"),
    endsAt: new Date("2026-08-01T00:00:00.000Z"),
    activatedAt: status === "scheduled" ? null : now,
    completedAt: status === "completed" ? now : null,
    createdByDiscordId: "owner-id",
    activatedByDiscordId: status === "scheduled" ? null : "owner-id",
    completedByDiscordId: status === "completed" ? "owner-id" : null,
    rules: {
      baselineRsr: 1_000,
      placementMatches: 10,
      softResetRetention: 0.5,
    },
    createdAt: now,
    updatedAt: now,
  };
}

describe("Season control UI", () => {
  it("creates and parses review and execution IDs", () => {
    const reviewId = CustomIds.buttons.seasonAdmin.lifecycle.review(
      "activate",
      "507f1f77bcf86cd799439011",
    );
    const executeId = CustomIds.buttons.seasonAdmin.lifecycle.execute(
      "complete",
      "507f1f77bcf86cd799439011",
    );

    assert.deepEqual(parseSeasonLifecycleCustomId(reviewId), {
      stage: "review",
      action: "activate",
      seasonId: "507f1f77bcf86cd799439011",
    });
    assert.deepEqual(parseSeasonLifecycleCustomId(executeId), {
      stage: "execute",
      action: "complete",
      seasonId: "507f1f77bcf86cd799439011",
    });
    assert.equal(parseSeasonLifecycleCustomId("season-admin:invalid"), null);
  });

  it("serializes empty, scheduled and active control states", () => {
    const emptyState: SeasonControlStateDto = {
      active: null,
      scheduled: [],
      recentlyCompleted: [],
    };
    const scheduled = createSeason("scheduled");
    const scheduledState: SeasonControlStateDto = {
      ...emptyState,
      scheduled: [scheduled],
    };
    const activeState: SeasonControlStateDto = {
      ...emptyState,
      active: { ...scheduled, status: "active", activatedAt: now },
    };

    const emptyJson = JSON.stringify(
      createSeasonControlView(emptyState, now).toJSON(),
    );
    const scheduledJson = JSON.stringify(
      createSeasonControlView(scheduledState, now).toJSON(),
    );
    const activeJson = JSON.stringify(
      createSeasonControlView(activeState, now).toJSON(),
    );

    assert.match(emptyJson, /No season is active/);
    assert.match(scheduledJson, /Review Activation/);
    assert.match(activeJson, /Review Completion/);
  });

  it("serializes explicit activation and completion confirmations", () => {
    const season = createSeason("scheduled");
    const activationJson = JSON.stringify(
      createSeasonLifecycleConfirmationView("activate", season).toJSON(),
    );
    const completionJson = JSON.stringify(
      createSeasonLifecycleConfirmationView("complete", {
        ...season,
        status: "active",
      }).toJSON(),
    );

    assert.match(activationJson, /Confirm Activate Season/);
    assert.match(activationJson, /single global season/);
    assert.match(completionJson, /Confirm Complete Season/);
    assert.match(completionJson, /cannot be reversed/);
  });

  it("builds the five-field season scheduling modal", () => {
    const json = createSeasonModal().toJSON();

    assert.equal(json.custom_id, CustomIds.modals.createSeason);
    assert.equal(json.components.length, 5);
    assert.deepEqual(
      json.components.map((row) => row.components[0]?.custom_id),
      [
        CustomIds.inputs.createSeason.sequence,
        CustomIds.inputs.createSeason.name,
        CustomIds.inputs.createSeason.softResetRetention,
        CustomIds.inputs.createSeason.startsAt,
        CustomIds.inputs.createSeason.endsAt,
      ],
    );
  });
});
