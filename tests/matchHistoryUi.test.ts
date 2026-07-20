import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PlayerRoles } from "../src/constants/playerRoles.js";
import type { SquadDto } from "../src/dto/SquadDto.js";
import { createMatchHistoryView } from "../src/ui/createMatchHistoryView.js";

function createVerifiedSquad(outcome: "win" | "loss"): SquadDto {
  const now = new Date("2026-07-19T12:00:00.000Z");

  return {
    id: `squad-${outcome}`,
    guildId: "guild-id",
    status: "completed",
    captainDiscordId: "player-0",
    voiceChannelId: null,
    participants: PlayerRoles.map((role, index) => ({
      discordId: `player-${index}`,
      displayName: `Player ${index}`,
      assignedRole: role,
      roleFit: "primary" as const,
      rsrBefore: 1_000,
      behaviorScore: 100,
      readyStatus: "accepted" as const,
    })),
    metrics: {
      averageRsr: 1_000,
      rsrSpread: 0,
      averageBehaviorScore: 100,
      behaviorSpread: 0,
      rolePenalty: 0,
      totalCost: 0,
      compatibilityScore: 100,
    },
    result: {
      outcome,
      reportedByDiscordId: "player-0",
      reportedAt: now,
      confirmedByDiscordIds: ["player-0", "player-1", "player-2"],
      disputedByDiscordIds: [],
      verifiedAt: now,
      statisticsProcessedAt: now,
      ratingChanges: [
        {
          discordId: "player-0",
          rsrBefore: 1_000,
          rsrAfter: outcome === "win" ? 1_032 : 968,
          delta: outcome === "win" ? 32 : -32,
          confidenceBefore: 20,
          confidenceAfter: 28,
          expectedWinProbability: 0.5,
          kFactor: 64,
          placementMatch: true,
        },
      ],
    },
    readyCheckExpiresAt: now,
    activatedAt: now,
    closedAt: now,
    closedByDiscordId: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe("Match history UI", () => {
  it("serializes an empty verified history", () => {
    assert.doesNotThrow(() => createMatchHistoryView([], "player-0").toJSON());
  });

  it("shows verified wins and losses with the assigned role", () => {
    const serialized = JSON.stringify(
      createMatchHistoryView(
        [createVerifiedSquad("win"), createVerifiedSquad("loss")],
        "player-0",
      ).toJSON(),
    );

    assert.match(serialized, /Victory/);
    assert.match(serialized, /Defeat/);
    assert.match(serialized, /EXP Lane/);
    assert.match(serialized, /\+32 RSR/);
    assert.match(serialized, /-32 RSR/);
  });
});
