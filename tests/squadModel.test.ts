import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PlayerRoles } from "../src/constants/playerRoles.js";
import { SquadModel } from "../src/models/SquadModel.js";

function createSquadInput() {
  return {
    guildId: "guild-id",
    sourceQueueKey: "queue-snapshot-key",
    status: "ready_check" as const,
    captainDiscordId: "player-0",
    participants: PlayerRoles.map((role, index) => ({
      discordId: `player-${index}`,
      displayName: `Player ${index}`,
      assignedRole: role,
      roleFit: "primary" as const,
      rsrBefore: 1_000,
      behaviorScore: 100,
      readyStatus: "pending" as const,
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
    result: null,
    readyCheckExpiresAt: new Date(Date.now() + 30_000),
    activatedAt: null,
    closedAt: null,
    closedByDiscordId: null,
  };
}

describe("SquadModel", () => {
  it("accepts a complete five-player squad snapshot", async () => {
    const squad = new SquadModel(createSquadInput());

    await assert.doesNotReject(squad.validate());
  });

  it("rejects duplicate participants and assigned roles", async () => {
    const input = createSquadInput();
    input.participants[1]!.discordId = input.participants[0]!.discordId;
    input.participants[1]!.assignedRole = input.participants[0]!.assignedRole;

    const squad = new SquadModel(input);

    await assert.rejects(squad.validate(), (error: unknown) => {
      assert.ok(error instanceof Error);

      return error.message.includes("participants");
    });
  });

  it("rejects a captain who is not part of the squad", async () => {
    const input = createSquadInput();
    input.captainDiscordId = "not-a-participant";

    const squad = new SquadModel(input);

    await assert.rejects(squad.validate(), (error: unknown) => {
      assert.ok(error instanceof Error);

      return error.message.includes("captainDiscordId");
    });
  });

  it("validates result responses against squad membership", async () => {
    const input = createSquadInput();
    input.result = {
      outcome: "win",
      reportedByDiscordId: "player-0",
      reportedAt: new Date(),
      confirmedByDiscordIds: ["player-0"],
      disputedByDiscordIds: ["outsider"],
      verifiedAt: null,
      statisticsProcessedAt: null,
      ratingChanges: [],
    };

    const squad = new SquadModel(input);

    await assert.rejects(squad.validate(), (error: unknown) => {
      assert.ok(error instanceof Error);

      return error.message.includes("result");
    });
  });

  it("rejects a partial rating audit", async () => {
    const input = createSquadInput();
    input.result = {
      outcome: "win",
      reportedByDiscordId: "player-0",
      reportedAt: new Date(),
      confirmedByDiscordIds: ["player-0"],
      disputedByDiscordIds: [],
      verifiedAt: new Date(),
      statisticsProcessedAt: new Date(),
      ratingChanges: [
        {
          discordId: "player-0",
          rsrBefore: 1_000,
          rsrAfter: 1_032,
          delta: 32,
          confidenceBefore: 20,
          confidenceAfter: 28,
          expectedWinProbability: 0.5,
          kFactor: 64,
          placementMatch: true,
        },
      ],
    };

    await assert.rejects(new SquadModel(input).validate(), /result/);
  });
});
