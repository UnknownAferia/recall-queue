import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ClientSession } from "mongoose";

import { IntegrityConfig } from "../src/constants/integrity.js";
import { PlayerRoles } from "../src/constants/playerRoles.js";
import type { TransactionRunner } from "../src/database/MongoTransactionRunner.js";
import {
  calculateEffectiveIntegrityLevel,
  IntegritySanctionPolicy,
  type IntegritySanctionPenalty,
} from "../src/domain/integrity/IntegritySanctionPolicy.js";
import type { PlayerDocument } from "../src/models/PlayerModel.js";
import { SquadModel, type SquadDocument } from "../src/models/SquadModel.js";
import type { PlayerRepository } from "../src/repositories/PlayerRepository.js";
import type { SquadRepository } from "../src/repositories/SquadRepository.js";
import { VerifiedResultProcessor } from "../src/services/VerifiedResultProcessor.js";
import type { ModerationAuditService } from "../src/services/ModerationAuditService.js";
import type {
  SquadIntegritySanction,
  SquadRatingChange,
} from "../src/types/squad.js";

const transactionRunner: TransactionRunner = {
  run: async <T>(operation: (session: ClientSession) => Promise<T>) =>
    operation({} as ClientSession),
};

function createDisputedSquad(): SquadDocument {
  const now = new Date("2026-07-20T12:00:00.000Z");

  return new SquadModel({
    guildId: "guild-id",
    sourceQueueKey: "integrity-sanction-source",
    status: "disputed",
    captainDiscordId: "player-0",
    participants: PlayerRoles.map((role, index) => ({
      discordId: `player-${index}`,
      displayName: `Player ${index}`,
      assignedRole: role,
      roleFit: "primary",
      rsrBefore: 1_000,
      behaviorScore: 100,
      readyStatus: "accepted",
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
      confirmedByDiscordIds: ["player-0"],
      disputedByDiscordIds: ["player-1"],
      verifiedAt: null,
      statisticsProcessedAt: null,
      ratingChanges: [],
      moderation: null,
      evidence: null,
    },
    readyCheckExpiresAt: now,
    activatedAt: now,
    closedAt: now,
    closedByDiscordId: "player-1",
  });
}

function createPlayers(): PlayerDocument[] {
  return PlayerRoles.map((_role, index) => ({
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

describe("Integrity sanctions", () => {
  it("escalates misleading evidence and deliberate fraud separately", () => {
    const policy = new IntegritySanctionPolicy();
    const now = new Date("2026-07-20T12:00:00.000Z");
    const first = policy.createPenalty(
      "misleading_evidence",
      { level: 0, lastSanctionAt: null },
      now,
    );
    const maximum = policy.createPenalty(
      "deliberate_fraud",
      { level: 3, lastSanctionAt: now },
      now,
    );

    assert.equal(first.levelAfter, 1);
    assert.equal(first.behaviorScoreLoss, 15);
    assert.equal(first.bannedUntil.getTime() - now.getTime(), 86_400_000);
    assert.equal(maximum.levelAfter, 3);
    assert.equal(maximum.behaviorScoreLoss, 50);
    assert.equal(
      maximum.bannedUntil.getTime() - now.getTime(),
      30 * 86_400_000,
    );
  });

  it("decays one integrity level per incident-free month", () => {
    const sanctionedAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date(
      sanctionedAt.getTime() + 2 * IntegrityConfig.levelDecayIntervalMs,
    );

    assert.equal(
      calculateEffectiveIntegrityLevel(
        { level: 3, lastSanctionAt: sanctionedAt },
        now,
      ),
      1,
    );
  });

  it("rejects a sanction aimed at anyone except the result reporter", async () => {
    const squad = createDisputedSquad();
    squad.result!.moderation = {
      decision: "voided",
      originalOutcome: "win",
      finalOutcome: null,
      moderatedByDiscordId: "moderator-id",
      moderatedAt: new Date(),
      sanction: {
        action: "deliberate_fraud",
        targetDiscordId: "player-1",
        behaviorScoreLoss: 30,
        integrityLevelBefore: 0,
        integrityLevelAfter: 1,
        bannedUntil: new Date(Date.now() + 86_400_000),
      },
    };

    await assert.rejects(
      squad.validate(),
      /Result and moderation data must belong to valid squad participants/,
    );
  });

  it("audits and applies a reporter sanction in the result transaction", async () => {
    const squad = createDisputedSquad();
    const players = createPlayers();
    let capturedAudit: SquadIntegritySanction | null = null;
    let capturedPenalty: IntegritySanctionPenalty | null = null;
    let recoveryIds: readonly string[] = [];
    let auditedSquadId: string | null = null;

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
        capturedAudit = sanction;
        squad.status = "completed";
        squad.result!.outcome = finalOutcome;
        squad.result!.moderation = {
          decision: "upheld",
          originalOutcome,
          finalOutcome,
          moderatedByDiscordId: moderatorDiscordId,
          moderatedAt: new Date(),
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
    const playerRepository = {
      findByDiscordId: async () => players[0]!,
      findByDiscordIds: async () => players,
      applyVerifiedSquadResult: async () => ({
        matchedCount: 5,
        modifiedCount: 5,
      }),
      recoverBehaviorAfterVerifiedResult: async (ids: readonly string[]) => {
        recoveryIds = ids;
        return ids.length;
      },
      applyIntegritySanction: async (
        _discordId: string,
        penalty: IntegritySanctionPenalty,
      ) => {
        capturedPenalty = penalty;
        return true;
      },
    } as unknown as PlayerRepository;
    const processor = new VerifiedResultProcessor(
      squadRepository,
      playerRepository,
      transactionRunner,
      { resultConfirmationsRequired: 3 },
      {
        recordDisputeResolution: async (resolvedSquad: SquadDocument) => {
          auditedSquadId = resolvedSquad.id;
          return {};
        },
      } as unknown as ModerationAuditService,
    );

    const resolved = await processor.processModerated(
      squad.id,
      "guild-id",
      "moderator-id",
      "win",
      "win",
      "player-0",
      "misleading_evidence",
    );

    assert.equal(capturedAudit?.targetDiscordId, "player-0");
    assert.equal(capturedAudit?.behaviorScoreLoss, 15);
    assert.equal(capturedPenalty?.action, "misleading_evidence");
    assert.equal(recoveryIds.includes("player-0"), false);
    assert.equal(resolved?.result?.ratingChanges.length, 5);
    assert.equal(auditedSquadId, squad.id);
  });

  it("can sanction a reporter while voiding without applying ratings", async () => {
    const squad = createDisputedSquad();
    const players = createPlayers();
    let sanctionCount = 0;
    let ratingUpdateCount = 0;
    const processor = new VerifiedResultProcessor(
      {
        voidDisputedResult: async (
          _squadId: string,
          _guildId: string,
          moderatorDiscordId: string,
          originalOutcome: "win" | "loss",
          _reportedByDiscordId: string,
          sanction: SquadIntegritySanction,
        ) => {
          squad.status = "cancelled";
          squad.result!.moderation = {
            decision: "voided",
            originalOutcome,
            finalOutcome: null,
            moderatedByDiscordId: moderatorDiscordId,
            moderatedAt: new Date(),
            sanction,
          };
          return squad;
        },
      } as unknown as SquadRepository,
      {
        findByDiscordId: async () => players[0]!,
        applyIntegritySanction: async () => {
          sanctionCount += 1;
          return true;
        },
        applyVerifiedSquadResult: async () => {
          ratingUpdateCount += 1;
          return { matchedCount: 5, modifiedCount: 5 };
        },
      } as unknown as PlayerRepository,
      transactionRunner,
      { resultConfirmationsRequired: 3 },
    );

    const resolved = await processor.processModeratedVoid(
      squad.id,
      "guild-id",
      "moderator-id",
      "win",
      "player-0",
      "deliberate_fraud",
    );

    assert.equal(resolved?.status, "cancelled");
    assert.equal(
      resolved?.result?.moderation?.sanction?.action,
      "deliberate_fraud",
    );
    assert.equal(sanctionCount, 1);
    assert.equal(ratingUpdateCount, 0);
  });
});
