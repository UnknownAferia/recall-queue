import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ClientSession } from "mongoose";

import { PlayerRoles } from "../src/constants/playerRoles.js";
import type { TransactionRunner } from "../src/database/MongoTransactionRunner.js";
import type { PlayerDocument } from "../src/models/PlayerModel.js";
import { SquadModel, type SquadDocument } from "../src/models/SquadModel.js";
import type { PlayerRepository } from "../src/repositories/PlayerRepository.js";
import type { SquadRepository } from "../src/repositories/SquadRepository.js";
import { VerifiedResultProcessor } from "../src/services/VerifiedResultProcessor.js";
import type {
  SquadIntegritySanction,
  SquadRatingChange,
} from "../src/types/squad.js";

function createPendingSquad(): SquadDocument {
  const now = new Date("2026-07-19T12:00:00.000Z");

  return new SquadModel({
    guildId: "guild-id",
    sourceQueueKey: "verified-result-source",
    status: "result_pending",
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
      outcome: "win",
      reportedByDiscordId: "player-0",
      reportedAt: now,
      confirmedByDiscordIds: ["player-0", "player-1", "player-2"],
      disputedByDiscordIds: [],
      verifiedAt: null,
      statisticsProcessedAt: null,
      ratingChanges: [],
    },
    readyCheckExpiresAt: now,
    activatedAt: now,
    closedAt: null,
    closedByDiscordId: null,
    createdAt: now,
    updatedAt: now,
  });
}

function createPlayers(count = 5): PlayerDocument[] {
  return Array.from({ length: count }, (_value, index) => ({
    discord: { id: `player-${index}` },
    rating: { rsr: 1_000, confidence: 20 },
    statistics: { matchesPlayed: 0, wins: 0, losses: 0 },
    behavior: {
      score: 100,
      penalties: 0,
      integrityLevel: 0,
      lastIntegritySanctionAt: null,
    },
  })) as PlayerDocument[];
}

const transactionRunner: TransactionRunner = {
  run: async <T>(operation: (session: ClientSession) => Promise<T>) =>
    operation({} as ClientSession),
};

describe("VerifiedResultProcessor", () => {
  it("updates and audits all five ratings exactly once", async () => {
    const squad = createPendingSquad();
    let resultAvailable = true;
    let playerUpdateCount = 0;
    let behaviorRecoveryCount = 0;
    let capturedChanges: readonly SquadRatingChange[] = [];

    const squadRepository = {
      completeVerifiedResult: async () => {
        if (!resultAvailable) {
          return null;
        }

        resultAvailable = false;
        const processedAt = new Date();
        squad.status = "completed";
        squad.closedAt = processedAt;
        squad.result!.verifiedAt = processedAt;
        squad.result!.statisticsProcessedAt = processedAt;
        return squad;
      },
      storeRatingChanges: async (
        _squadId: string,
        changes: readonly SquadRatingChange[],
      ) => {
        squad.result!.ratingChanges = [...changes];
        return squad;
      },
    } as unknown as SquadRepository;

    const playerRepository = {
      findByDiscordIds: async () => createPlayers(),
      applyVerifiedSquadResult: async (
        changes: readonly SquadRatingChange[],
      ) => {
        playerUpdateCount += 1;
        capturedChanges = changes;
        return { matchedCount: 5, modifiedCount: 5 };
      },
      recoverBehaviorAfterVerifiedResult: async () => {
        behaviorRecoveryCount += 1;
        return 5;
      },
    } as unknown as PlayerRepository;

    const processor = new VerifiedResultProcessor(
      squadRepository,
      playerRepository,
      transactionRunner,
      { resultConfirmationsRequired: 3 },
    );

    const completed = await processor.process(squad.id);
    const repeated = await processor.process(squad.id);

    assert.equal(completed?.status, "completed");
    assert.equal(completed?.result?.ratingChanges.length, 5);
    assert.equal(repeated, null);
    assert.equal(playerUpdateCount, 1);
    assert.equal(behaviorRecoveryCount, 1);
    assert.equal(capturedChanges[0]?.delta, 32);
    assert.equal(capturedChanges[0]?.confidenceAfter, 28);
  });

  it("rejects a partial player rating update", async () => {
    const squad = createPendingSquad();

    const processor = new VerifiedResultProcessor(
      {
        completeVerifiedResult: async () => squad,
      } as unknown as SquadRepository,
      {
        findByDiscordIds: async () => createPlayers(),
        applyVerifiedSquadResult: async () => ({
          matchedCount: 4,
          modifiedCount: 4,
        }),
      } as unknown as PlayerRepository,
      transactionRunner,
      { resultConfirmationsRequired: 3 },
    );

    await assert.rejects(
      processor.process(squad.id),
      /could not update all 5 player profiles/,
    );
  });

  it("rejects processing when a participant profile is missing", async () => {
    const squad = createPendingSquad();
    const processor = new VerifiedResultProcessor(
      {
        completeVerifiedResult: async () => squad,
      } as unknown as SquadRepository,
      {
        findByDiscordIds: async () => createPlayers(4),
      } as unknown as PlayerRepository,
      transactionRunner,
      { resultConfirmationsRequired: 3 },
    );

    await assert.rejects(
      processor.process(squad.id),
      /could not load all 5 player profiles/,
    );
  });

  it("processes a staff-corrected result through the same transaction", async () => {
    const squad = createPendingSquad();
    squad.status = "disputed";
    squad.result!.outcome = "win";
    squad.result!.disputedByDiscordIds = ["player-1"];
    squad.result!.confirmedByDiscordIds = ["player-0"];
    let appliedOutcome: "win" | "loss" | undefined;

    const squadRepository = {
      completeModeratedResult: async (
        _squadId: string,
        _guildId: string,
        moderatorDiscordId: string,
        originalOutcome: "win" | "loss",
        finalOutcome: "win" | "loss",
        _reportedByDiscordId: string,
        sanction: SquadIntegritySanction,
      ) => {
        const moderatedAt = new Date();
        squad.status = "completed";
        squad.result!.outcome = finalOutcome;
        squad.result!.verifiedAt = moderatedAt;
        squad.result!.statisticsProcessedAt = moderatedAt;
        squad.result!.moderation = {
          decision: "overridden",
          originalOutcome,
          finalOutcome,
          moderatedByDiscordId: moderatorDiscordId,
          moderatedAt,
          sanction,
        };
        return squad;
      },
      storeRatingChanges: async (
        _squadId: string,
        changes: readonly SquadRatingChange[],
      ) => {
        squad.result!.ratingChanges = [...changes];
        return squad;
      },
    } as unknown as SquadRepository;

    const processor = new VerifiedResultProcessor(
      squadRepository,
      {
        findByDiscordId: async () => createPlayers()[0]!,
        findByDiscordIds: async () => createPlayers(),
        applyVerifiedSquadResult: async (
          _changes: readonly SquadRatingChange[],
          outcome: "win" | "loss",
        ) => {
          appliedOutcome = outcome;
          return { matchedCount: 5, modifiedCount: 5 };
        },
        recoverBehaviorAfterVerifiedResult: async () => 5,
      } as unknown as PlayerRepository,
      transactionRunner,
      { resultConfirmationsRequired: 3 },
    );

    const resolved = await processor.processModerated(
      squad.id,
      "guild-id",
      "moderator-id",
      "win",
      "loss",
      "player-0",
      "none",
    );

    assert.equal(appliedOutcome, "loss");
    assert.equal(resolved?.result?.moderation?.decision, "overridden");
    assert.equal(resolved?.result?.ratingChanges.length, 5);
    assert.equal(resolved?.result?.ratingChanges[0]?.delta, -32);
  });
});
