import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ClientSession } from "mongoose";

import {
  CustomIds,
  parsePlayerAdministrationOperationCustomId,
} from "../src/constants/customIds.js";
import type { TransactionRunner } from "../src/database/MongoTransactionRunner.js";
import {
  PlayerAdministrationOperationModel,
  type PlayerAdministrationOperationDocument,
} from "../src/models/PlayerAdministrationOperationModel.js";
import { PlayerModel, type PlayerDocument } from "../src/models/PlayerModel.js";
import { PlayerAdministrationRepository } from "../src/repositories/PlayerAdministrationRepository.js";
import { PlayerAdministrationService } from "../src/services/PlayerAdministrationService.js";
import { PlayerAdministrationError } from "../src/services/errors/PlayerAdministrationError.js";
import type {
  PlayerAdministrationHistorySummary,
  PlayerAdministrationOperation,
} from "../src/types/playerAdministration.js";
import { createPlayerAdministrationInspectionView } from "../src/ui/createPlayerAdministrationView.js";

const OperationId = "507f1f77bcf86cd799439011";
const PlayerId = "507f191e810c19729de860ea";
const Now = new Date("2026-07-22T18:00:00.000Z");

function createPlayer(overrides: {
  matchesPlayed?: number;
  penalties?: number;
  declinedMatches?: number;
} = {}): PlayerDocument {
  return new PlayerModel({
    _id: PlayerId,
    discord: { id: "target-id", username: "Target" },
    game: { ign: "Target", playerId: "123456", serverId: "1234" },
    rating: { rsr: 1_000, confidence: 20 },
    statistics: {
      matchesPlayed: overrides.matchesPlayed ?? 0,
      wins: overrides.matchesPlayed ?? 0,
      losses: 0,
    },
    behavior: {
      score: 100,
      penalties: overrides.penalties ?? 0,
      integrityLevel: 0,
      lastIntegritySanctionAt: null,
    },
    queue: {
      acceptedMatches: 0,
      declinedMatches: overrides.declinedMatches ?? 0,
      bannedUntil: null,
      disciplineLevel: 0,
      lastPenaltyAt: null,
    },
    verification: { status: "verified" },
    preferences: { roles: { primary: "jungle", secondary: "mid" } },
    createdAt: Now,
    updatedAt: Now,
  });
}

function createHistory(
  overrides: Partial<PlayerAdministrationHistorySummary> = {},
): PlayerAdministrationHistorySummary {
  return {
    queueGuildIds: [],
    activeSquadId: null,
    activeSquadGuildId: null,
    competitiveSquads: 0,
    seasonMemberships: 0,
    moderationRecords: 0,
    pendingVerifications: 0,
    ...overrides,
  };
}

function createOperation(
  action: "reset_verification" | "unregister",
  overrides: Partial<PlayerAdministrationOperation> = {},
): PlayerAdministrationOperationDocument {
  return new PlayerAdministrationOperationModel({
    _id: OperationId,
    schemaVersion: 1,
    action,
    status: "pending",
    guildId: "guild-id",
    actorDiscordId: "staff-id",
    targetDiscordId: "target-id",
    reason: "Requested by the account owner for testing.",
    expiresAt: new Date(Date.now() + 60_000),
    completedAt: null,
    blockerReasons: [],
    snapshot: null,
    result: null,
    createdAt: Now,
    updatedAt: Now,
    ...overrides,
  });
}

function createRunner(): TransactionRunner {
  return {
    run: async <T>(operation: (session: ClientSession) => Promise<T>) =>
      operation({} as ClientSession),
  };
}

function operationMapper(document: PlayerAdministrationOperationDocument) {
  return new PlayerAdministrationRepository().toOperation(document);
}

describe("Player administration", () => {
  it("inspects the full player state and explains every deletion blocker", async () => {
    const repository = {
      findPlayer: async () => createPlayer({ matchesPlayed: 4, penalties: 1 }),
      getHistorySummary: async () =>
        createHistory({
          activeSquadId: "active-squad-id",
          activeSquadGuildId: "guild-id",
          competitiveSquads: 2,
          seasonMemberships: 1,
          moderationRecords: 3,
          pendingVerifications: 1,
          queueGuildIds: ["guild-id"],
        }),
    } as unknown as PlayerAdministrationRepository;
    const service = new PlayerAdministrationService(repository, createRunner());

    const inspection = await service.inspect("target-id");

    assert.equal(inspection.canUnregister, false);
    assert.equal(inspection.unregisterBlockers.length, 6);
    assert.equal(inspection.history.pendingVerifications, 1);
    assert.match(
      JSON.stringify(createPlayerAdministrationInspectionView(inspection).toJSON()),
      /Protected history is never removed/,
    );
  });

  it("marks a genuinely unused profile as eligible for unregistration", async () => {
    const repository = {
      findPlayer: async () => createPlayer(),
      getHistorySummary: async () => createHistory(),
    } as unknown as PlayerAdministrationRepository;
    const service = new PlayerAdministrationService(repository, createRunner());

    const inspection = await service.inspect("target-id");

    assert.equal(inspection.canUnregister, true);
    assert.deepEqual(inspection.unregisterBlockers, []);
  });

  it("rejects missing profiles, self-actions and weak audit reasons", async () => {
    const missingRepository = {
      findPlayer: async () => null,
    } as unknown as PlayerAdministrationRepository;
    const missingService = new PlayerAdministrationService(
      missingRepository,
      createRunner(),
    );
    await assert.rejects(
      missingService.inspect("missing-id"),
      PlayerAdministrationError,
    );

    const repository = {
      findPlayer: async () => createPlayer(),
      getHistorySummary: async () => createHistory(),
    } as unknown as PlayerAdministrationRepository;
    const service = new PlayerAdministrationService(repository, createRunner());
    await assert.rejects(
      service.prepare(
        "unregister",
        "guild-id",
        "target-id",
        "target-id",
        "A sufficiently detailed reason.",
      ),
      PlayerAdministrationError,
    );
    await assert.rejects(
      service.prepare(
        "unregister",
        "guild-id",
        "staff-id",
        "target-id",
        "short",
      ),
      PlayerAdministrationError,
    );
  });

  it("refuses to prepare deletion for match, season or moderation history", async () => {
    for (const history of [
      createHistory({ competitiveSquads: 1 }),
      createHistory({ seasonMemberships: 1 }),
      createHistory({ moderationRecords: 1 }),
    ]) {
      const repository = {
        findPlayer: async () => createPlayer(),
        getHistorySummary: async () => history,
      } as unknown as PlayerAdministrationRepository;
      const service = new PlayerAdministrationService(repository, createRunner());

      await assert.rejects(
        service.prepare(
          "unregister",
          "guild-id",
          "staff-id",
          "target-id",
          "Unused profile requested by account owner.",
        ),
        PlayerAdministrationError,
      );
    }
  });

  it("unregisters an unused profile atomically and records its audit snapshot", async () => {
    const operation = createOperation("unregister");
    const events: string[] = [];
    const repository = {
      findOwnedOperation: async () => operation,
      findPlayer: async () => createPlayer(),
      getHistorySummary: async () => createHistory({ queueGuildIds: ["guild-id"] }),
      removeFromAllQueues: async () => {
        events.push("queues-removed");
        return 1;
      },
      closePendingVerifications: async () => {
        events.push("verification-closed");
        return [{
          archiveChannelId: "channel-id",
          archiveMessageId: "message-id",
          archiveAttachmentId: "attachment-id",
          fileName: "profile.png",
          contentType: "image/png",
          size: 2_048,
        }];
      },
      deleteUnusedPlayer: async () => {
        events.push("player-deleted");
        return true;
      },
      transitionOperation: async (
        _id: string,
        _status: string,
        update: Record<string, unknown>,
      ) => {
        operation.set(update);
        return operation;
      },
      toOperation: operationMapper,
    } as unknown as PlayerAdministrationRepository;
    const service = new PlayerAdministrationService(repository, createRunner());

    const result = await service.execute(OperationId, "guild-id", "staff-id");

    assert.deepEqual(events, [
      "queues-removed",
      "verification-closed",
      "player-deleted",
    ]);
    assert.equal(result.operation.status, "completed");
    assert.equal(result.operation.result?.playerDeleted, true);
    assert.equal(result.operation.snapshot?.gamePlayerId, "123456");
    assert.equal(result.evidence.length, 1);
  });

  it("resets verification while preserving the player profile", async () => {
    const operation = createOperation("reset_verification");
    let deleteCalled = false;
    let resetCalled = false;
    const repository = {
      findOwnedOperation: async () => operation,
      findPlayer: async () => createPlayer({ matchesPlayed: 20 }),
      getHistorySummary: async () => createHistory({ competitiveSquads: 4 }),
      removeFromAllQueues: async () => 2,
      closePendingVerifications: async () => [],
      deleteUnusedPlayer: async () => {
        deleteCalled = true;
        return true;
      },
      resetVerification: async () => {
        resetCalled = true;
        return true;
      },
      transitionOperation: async (
        _id: string,
        _status: string,
        update: Record<string, unknown>,
      ) => {
        operation.set(update);
        return operation;
      },
      toOperation: operationMapper,
    } as unknown as PlayerAdministrationRepository;
    const service = new PlayerAdministrationService(repository, createRunner());

    const result = await service.execute(OperationId, "guild-id", "staff-id");

    assert.equal(result.operation.status, "completed");
    assert.equal(result.operation.result?.playerDeleted, false);
    assert.equal(resetCalled, true);
    assert.equal(deleteCalled, false);
  });

  it("blocks safely when an active squad appears after confirmation", async () => {
    const operation = createOperation("unregister");
    let mutated = false;
    const repository = {
      findOwnedOperation: async () => operation,
      findPlayer: async () => createPlayer(),
      getHistorySummary: async () =>
        createHistory({ activeSquadId: "new-active-squad" }),
      removeFromAllQueues: async () => {
        mutated = true;
        return 0;
      },
      transitionOperation: async (
        _id: string,
        _status: string,
        update: Record<string, unknown>,
      ) => {
        operation.set(update);
        return operation;
      },
      toOperation: operationMapper,
    } as unknown as PlayerAdministrationRepository;
    const service = new PlayerAdministrationService(repository, createRunner());

    const result = await service.execute(OperationId, "guild-id", "staff-id");

    assert.equal(result.operation.status, "blocked");
    assert.equal(mutated, false);
  });

  it("expires old confirmations and refuses foreign operations", async () => {
    const expired = createOperation("unregister", {
      expiresAt: new Date(Date.now() - 1_000),
    });
    const repository = {
      findOwnedOperation: async (
        _id: string,
        _guildId: string,
        actorDiscordId: string,
      ) => (actorDiscordId === "staff-id" ? expired : null),
      transitionOperation: async (
        _id: string,
        _status: string,
        update: Record<string, unknown>,
      ) => {
        expired.set(update);
        return expired;
      },
      toOperation: operationMapper,
    } as unknown as PlayerAdministrationRepository;
    const service = new PlayerAdministrationService(repository, createRunner());

    const result = await service.execute(OperationId, "guild-id", "staff-id");
    assert.equal(result.operation.status, "expired");
    await assert.rejects(
      service.execute(OperationId, "guild-id", "other-staff"),
      PlayerAdministrationError,
    );
  });

  it("uses signed-by-ownership operation routes and audit-oriented indexes", () => {
    const customId = CustomIds.buttons.playerAdministration.confirm(
      "unregister",
      OperationId,
    );
    assert.deepEqual(parsePlayerAdministrationOperationCustomId(customId), {
      decision: "confirm",
      action: "unregister",
      operationId: OperationId,
    });
    assert.equal(
      parsePlayerAdministrationOperationCustomId(
        `player-admin:operation:confirm:unregister:not-an-object-id`,
      ),
      null,
    );

    const indexes = PlayerAdministrationOperationModel.schema.indexes();
    assert.equal(
      indexes.some(
        ([fields, options]) =>
          fields.targetDiscordId === 1 &&
          fields.createdAt === -1 &&
          options.name === "player_administration_audit_history",
      ),
      true,
    );
  });
});
