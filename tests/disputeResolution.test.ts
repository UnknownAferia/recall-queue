import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PlayerRoles } from "../src/constants/playerRoles.js";
import type { SquadResult } from "../src/constants/squad.js";
import type { IntegritySanctionAction } from "../src/constants/integrity.js";
import { SquadModel, type SquadDocument } from "../src/models/SquadModel.js";
import type { SquadRepository } from "../src/repositories/SquadRepository.js";
import { DisputeModerationService } from "../src/services/DisputeModerationService.js";
import type { VerifiedResultProcessor } from "../src/services/VerifiedResultProcessor.js";
import { InvalidDisputeReferenceError } from "../src/services/errors/InvalidDisputeReferenceError.js";
import { createClosedSquadView } from "../src/ui/createClosedSquadView.js";
import { createDisputeResolutionView } from "../src/ui/createDisputeResolutionView.js";

const SquadId = "507f1f77bcf86cd799439011";

function createDisputedSquad(outcome: SquadResult = "win"): SquadDocument {
  const now = new Date("2026-07-20T12:00:00.000Z");

  return new SquadModel({
    _id: SquadId,
    guildId: "guild-id",
    sourceQueueKey: `resolution-${outcome}`,
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
      outcome,
      reportedByDiscordId: "player-0",
      reportedAt: now,
      confirmedByDiscordIds: ["player-0"],
      disputedByDiscordIds: ["player-1"],
      verifiedAt: null,
      statisticsProcessedAt: null,
      ratingChanges: [],
      moderation: null,
    },
    readyCheckExpiresAt: now,
    activatedAt: now,
    closedAt: now,
    closedByDiscordId: "player-1",
  });
}

function createServiceForResult(
  squad: SquadDocument,
  capture: {
    finalOutcome?: SquadResult;
    sanctionAction?: IntegritySanctionAction;
    reportedByDiscordId?: string;
  },
): DisputeModerationService {
  const repository = {
    findDisputedById: async () => squad,
  } as unknown as SquadRepository;

  const processor = {
    processModerated: async (
      _squadId: string,
      _guildId: string,
      moderatorDiscordId: string,
      originalOutcome: SquadResult,
      finalOutcome: SquadResult,
      reportedByDiscordId: string,
      sanctionAction: IntegritySanctionAction,
    ) => {
      capture.finalOutcome = finalOutcome;
      capture.reportedByDiscordId = reportedByDiscordId;
      capture.sanctionAction = sanctionAction;
      const now = new Date("2026-07-20T13:00:00.000Z");
      squad.status = "completed";
      squad.result!.outcome = finalOutcome;
      squad.result!.moderation = {
        decision:
          originalOutcome === finalOutcome ? "upheld" : "overridden",
        originalOutcome,
        finalOutcome,
        moderatedByDiscordId: moderatorDiscordId,
        moderatedAt: now,
        sanction: {
          action: sanctionAction,
          targetDiscordId: reportedByDiscordId,
          behaviorScoreLoss: sanctionAction === "none" ? 0 : 15,
          integrityLevelBefore: 0,
          integrityLevelAfter: sanctionAction === "none" ? 0 : 1,
          bannedUntil:
            sanctionAction === "none" ? null : new Date(now.getTime() + 1),
        },
      };
      return squad;
    },
  } as unknown as VerifiedResultProcessor;

  return new DisputeModerationService(repository, processor);
}

describe("Dispute resolution", () => {
  it("upholds the reported result and records the moderator", async () => {
    const squad = createDisputedSquad("win");
    const capture: { finalOutcome?: SquadResult } = {};
    const service = createServiceForResult(squad, capture);

    const resolved = await service.resolve(
      "guild-id",
      SquadId,
      "moderator-id",
      "uphold",
      "none",
    );

    assert.equal(capture.finalOutcome, "win");
    assert.equal(capture.reportedByDiscordId, "player-0");
    assert.equal(capture.sanctionAction, "none");
    assert.equal(resolved.result?.moderation?.decision, "upheld");
    assert.equal(
      resolved.result?.moderation?.moderatedByDiscordId,
      "moderator-id",
    );
    assert.doesNotThrow(() => createDisputeResolutionView(resolved).toJSON());
    assert.doesNotThrow(() => createClosedSquadView(resolved).toJSON());
  });

  it("overrides a reported defeat with a final victory", async () => {
    const squad = createDisputedSquad("loss");
    const capture: { finalOutcome?: SquadResult } = {};
    const service = createServiceForResult(squad, capture);

    const resolved = await service.resolve(
      "guild-id",
      SquadId,
      "moderator-id",
      "victory",
      "misleading_evidence",
    );

    assert.equal(capture.finalOutcome, "win");
    assert.equal(resolved.result?.outcome, "win");
    assert.equal(resolved.result?.moderation?.originalOutcome, "loss");
    assert.equal(resolved.result?.moderation?.decision, "overridden");
    assert.equal(
      resolved.result?.moderation?.sanction?.action,
      "misleading_evidence",
    );
  });

  it("voids a dispute without processing ratings", async () => {
    const squad = createDisputedSquad("win");
    let ratingProcessorCalled = false;
    let voidProcessorCalled = false;
    const service = new DisputeModerationService(
      {
        findDisputedById: async () => squad,
      } as unknown as SquadRepository,
      {
        processModerated: async () => {
          ratingProcessorCalled = true;
          return null;
        },
        processModeratedVoid: async (
          _squadId: string,
          _guildId: string,
          moderatorDiscordId: string,
          originalOutcome: SquadResult,
          reportedByDiscordId: string,
          sanctionAction: IntegritySanctionAction,
        ) => {
          voidProcessorCalled = true;
          squad.status = "cancelled";
          squad.result!.moderation = {
            decision: "voided",
            originalOutcome,
            finalOutcome: null,
            moderatedByDiscordId: moderatorDiscordId,
            moderatedAt: new Date(),
            sanction: {
              action: sanctionAction,
              targetDiscordId: reportedByDiscordId,
              behaviorScoreLoss: 30,
              integrityLevelBefore: 0,
              integrityLevelAfter: 1,
              bannedUntil: new Date(),
            },
          };
          return squad;
        },
      } as unknown as VerifiedResultProcessor,
    );

    const resolved = await service.resolve(
      "guild-id",
      SquadId,
      "moderator-id",
      "void",
      "deliberate_fraud",
    );

    assert.equal(ratingProcessorCalled, false);
    assert.equal(voidProcessorCalled, true);
    assert.equal(resolved.status, "cancelled");
    assert.equal(resolved.result?.moderation?.finalOutcome, null);
    assert.equal(resolved.result?.ratingChanges.length, 0);
    assert.equal(
      resolved.result?.moderation?.sanction?.targetDiscordId,
      "player-0",
    );
    assert.doesNotThrow(() => createClosedSquadView(resolved).toJSON());
  });

  it("rejects an invalid or already resolved dispute", async () => {
    const service = new DisputeModerationService(
      {
        findDisputedById: async () => null,
      } as unknown as SquadRepository,
      {} as VerifiedResultProcessor,
    );

    await assert.rejects(
      service.resolve(
        "guild-id",
        "invalid",
        "moderator-id",
        "uphold",
        "none",
      ),
      InvalidDisputeReferenceError,
    );
    await assert.rejects(
      service.resolve(
        "guild-id",
        SquadId,
        "moderator-id",
        "uphold",
        "none",
      ),
      InvalidDisputeReferenceError,
    );
  });
});
