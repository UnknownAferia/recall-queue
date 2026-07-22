import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  SeasonDto,
  SeasonHistoryEntryDto,
  SeasonLeaderboardDto,
} from "../src/dto/SeasonDto.js";
import { createLeaderboardView } from "../src/ui/createLeaderboardView.js";
import { createSeasonHistoryView } from "../src/ui/createSeasonHistoryView.js";

const season: SeasonDto = {
  id: "507f1f77bcf86cd799439011",
  sequence: 1,
  name: "Alpha Season",
  slug: "season-1-alpha-season",
  status: "completed",
  startsAt: new Date("2026-08-01T00:00:00.000Z"),
  endsAt: new Date("2026-11-01T00:00:00.000Z"),
  activatedAt: new Date("2026-08-01T00:00:00.000Z"),
  completedAt: new Date("2026-11-01T00:00:00.000Z"),
  createdByDiscordId: "owner-id",
  activatedByDiscordId: "owner-id",
  completedByDiscordId: "owner-id",
  rules: {
    baselineRsr: 1_000,
    placementMatches: 10,
    softResetRetention: 0.5,
  },
  createdAt: new Date("2026-07-22T00:00:00.000Z"),
  updatedAt: new Date("2026-11-01T00:00:00.000Z"),
};

describe("Season progression UI", () => {
  it("shows a qualified seasonal ranking beside lifetime rating", () => {
    const leaderboard: SeasonLeaderboardDto = {
      season,
      entries: [
        {
          rank: 1,
          discordId: "player-id",
          ign: "Vora Champion",
          currentRsr: 1_650,
          peakRsr: 1_700,
          matchesPlayed: 30,
          wins: 20,
          losses: 10,
          achievements: ["champion", "veteran"],
        },
      ],
    };
    const serialized = JSON.stringify(
      createLeaderboardView([], "player-id", leaderboard).toJSON(),
    );

    assert.match(serialized, /Alpha Season/);
    assert.match(serialized, /Vora Champion/);
    assert.match(serialized, /1.650 RSR/);
    assert.match(serialized, /Lifetime Rating/);
  });

  it("shows frozen final rank and achievements in personal history", () => {
    const entry: SeasonHistoryEntryDto = {
      season,
      initialRsr: 1_200,
      currentRsr: 1_650,
      peakRsr: 1_700,
      finalRsr: 1_650,
      finalRank: 1,
      matchesPlayed: 30,
      wins: 20,
      losses: 10,
      placementComplete: true,
      achievements: ["champion", "veteran"],
    };
    const serialized = JSON.stringify(
      createSeasonHistoryView([entry]).toJSON(),
    );

    assert.match(serialized, /Final rank/);
    assert.match(serialized, /#1/);
    assert.match(serialized, /Champion/);
    assert.match(serialized, /Veteran/);
  });
});
