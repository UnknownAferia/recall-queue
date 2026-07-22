import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Types, type ClientSession } from "mongoose";

import type { TransactionRunner } from "../src/database/MongoTransactionRunner.js";
import { SeasonMembershipModel } from "../src/models/SeasonMembershipModel.js";
import { SeasonModel } from "../src/models/SeasonModel.js";
import type { SeasonRepository } from "../src/repositories/SeasonRepository.js";
import { SeasonProgressionService } from "../src/services/SeasonProgressionService.js";
import { SeasonService } from "../src/services/SeasonService.js";
import type { SquadRatingChange } from "../src/types/squad.js";

const now = new Date("2026-07-22T12:00:00.000Z");
const session = {} as ClientSession;
const transactionRunner: TransactionRunner = {
  run: async <T>(operation: (value: ClientSession) => Promise<T>) =>
    operation(session),
};

function createSeason(status: "scheduled" | "active" | "completed") {
  return new SeasonModel({
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
    rules: {},
    createdAt: now,
    updatedAt: now,
  });
}

describe("Season foundation", () => {
  it("validates season dates and membership statistics", async () => {
    const invalidSeason = createSeason("scheduled");
    invalidSeason.endsAt = invalidSeason.startsAt;

    await assert.rejects(invalidSeason.validate(), /must end after it starts/);

    const invalidMembership = new SeasonMembershipModel({
      seasonId: new Types.ObjectId(),
      playerId: new Types.ObjectId(),
      discordId: "player-id",
      initialRsr: 1_000,
      currentRsr: 1_020,
      peakRsr: 1_020,
      finalRsr: null,
      matchesPlayed: 2,
      wins: 2,
      losses: 1,
      joinedAt: now,
      lastMatchAt: now,
    });

    await assert.rejects(
      invalidMembership.validate(),
      /must equal matches played/,
    );
  });

  it("declares one active season and one membership per season and player", () => {
    const seasonIndexes = SeasonModel.schema.indexes();
    const membershipIndexes = SeasonMembershipModel.schema.indexes();

    assert.ok(
      seasonIndexes.some(
        ([, options]) =>
          options.name === "unique_active_season" && options.unique === true,
      ),
    );
    assert.ok(
      membershipIndexes.some(
        ([, options]) =>
          options.name === "unique_season_player" && options.unique === true,
      ),
    );
  });

  it("normalizes a scheduled season and stores its rule snapshot", async () => {
    let capturedName = "";
    let capturedRetention = 0;

    const repository = {
      createScheduled: async (input: {
        name: string;
        rules: { softResetRetention: number };
      }) => {
        capturedName = input.name;
        capturedRetention = input.rules.softResetRetention;
        return createSeason("scheduled");
      },
    } as unknown as SeasonRepository;
    const service = new SeasonService(repository, transactionRunner);

    const season = await service.createScheduled({
      sequence: 1,
      name: "  Alpha   Season  ",
      slug: "ALPHA-SEASON",
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      endsAt: new Date("2026-08-01T00:00:00.000Z"),
      createdByDiscordId: "owner-id",
    });

    assert.equal(capturedName, "Alpha Season");
    assert.equal(capturedRetention, 0.5);
    assert.equal(season.status, "scheduled");
  });

  it("reports duplicate season sequences and slugs as lifecycle conflicts", async () => {
    const repository = {
      createScheduled: async () => {
        throw { code: 11000 };
      },
    } as unknown as SeasonRepository;
    const service = new SeasonService(repository, transactionRunner);

    await assert.rejects(
      service.createScheduled({
        sequence: 1,
        name: "Alpha Season",
        slug: "alpha-season",
        startsAt: new Date("2026-07-01T00:00:00.000Z"),
        endsAt: new Date("2026-08-01T00:00:00.000Z"),
        createdByDiscordId: "owner-id",
      }),
      /sequence or slug already exists/,
    );
  });

  it("completes a season and freezes every member rating transactionally", async () => {
    const active = createSeason("active");
    let finalizedSeasonId = "";
    let receivedSession: ClientSession | undefined;

    const repository = {
      completeActive: async (
        _seasonId: string,
        _actorDiscordId: string,
        _completedAt: Date,
        currentSession: ClientSession,
      ) => {
        active.status = "completed";
        active.completedAt = now;
        receivedSession = currentSession;
        return active;
      },
      finalizeMemberships: async (
        seasonId: Types.ObjectId,
        currentSession: ClientSession,
      ) => {
        finalizedSeasonId = seasonId.toString();
        assert.equal(currentSession, session);
        return 5;
      },
    } as unknown as SeasonRepository;
    const service = new SeasonService(repository, transactionRunner);

    const completed = await service.complete(active.id, "owner-id", now);

    assert.equal(completed.status, "completed");
    assert.equal(finalizedSeasonId, active.id);
    assert.equal(receivedSession, session);
  });

  it("records all players only when a season is active", async () => {
    const active = createSeason("active");
    let activeSeason = false;
    let recordedPlayers = 0;
    const players = Array.from({ length: 5 }, (_value, index) => ({
      playerId: new Types.ObjectId(),
      discordId: `player-${index}`,
    }));
    const ratingChanges: SquadRatingChange[] = players.map((player) => ({
      discordId: player.discordId,
      rsrBefore: 1_000,
      rsrAfter: 1_032,
      delta: 32,
      confidenceBefore: 20,
      confidenceAfter: 28,
      expectedWinProbability: 0.5,
      kFactor: 64,
      placementMatch: true,
    }));

    const repository = {
      findActive: async () => (activeSeason ? active : null),
      recordVerifiedResult: async (
        _seasonId: Types.ObjectId,
        receivedPlayers: typeof players,
      ) => {
        recordedPlayers = receivedPlayers.length;
        return receivedPlayers.length;
      },
    } as unknown as SeasonRepository;
    const service = new SeasonProgressionService(repository);

    assert.equal(
      await service.recordVerifiedResult(
        players,
        ratingChanges,
        "win",
        session,
        now,
      ),
      0,
    );

    activeSeason = true;

    assert.equal(
      await service.recordVerifiedResult(
        players,
        ratingChanges,
        "win",
        session,
        now,
      ),
      5,
    );
    assert.equal(recordedPlayers, 5);
  });
});
