import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ClientSession } from "mongoose";

import { ModerationAuditConfig } from "../src/constants/moderationAudit.js";
import { PlayerRoles } from "../src/constants/playerRoles.js";
import type { ModerationAuditDto } from "../src/dto/ModerationAuditDto.js";
import {
  ModerationAuditModel,
  type ModerationAuditDocument,
} from "../src/models/ModerationAuditModel.js";
import { SquadModel, type SquadDocument } from "../src/models/SquadModel.js";
import type { ModerationAuditRepository } from "../src/repositories/ModerationAuditRepository.js";
import { ModerationAuditService } from "../src/services/ModerationAuditService.js";
import type { CreateModerationAuditEventInput } from "../src/types/moderationAudit.js";
import { createModerationAuditView } from "../src/ui/createModerationAuditView.js";

const SquadId = "507f1f77bcf86cd799439011";
const OccurredAt = new Date("2026-07-20T14:00:00.000Z");
const CreatedAt = new Date("2026-07-20T14:00:01.000Z");

function createResolvedSquad(): SquadDocument {
  return new SquadModel({
    _id: SquadId,
    guildId: "guild-id",
    sourceQueueKey: "audit-source",
    status: "completed",
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
      outcome: "loss",
      reportedByDiscordId: "player-0",
      reportedAt: OccurredAt,
      confirmedByDiscordIds: ["player-0"],
      disputedByDiscordIds: ["player-1"],
      verifiedAt: OccurredAt,
      statisticsProcessedAt: OccurredAt,
      ratingChanges: [],
      evidence: {
        archiveChannelId: "archive-channel",
        archiveMessageId: "archive-message",
        archiveAttachmentId: "archive-attachment",
        fileName: "result.png",
        contentType: "image/png",
        size: 42_000,
        submittedByDiscordId: "player-0",
        submittedAt: OccurredAt,
      },
      moderation: {
        decision: "overridden",
        originalOutcome: "win",
        finalOutcome: "loss",
        moderatedByDiscordId: "moderator-id",
        moderatedAt: OccurredAt,
        sanction: {
          action: "misleading_evidence",
          targetDiscordId: "player-0",
          behaviorScoreLoss: 15,
          integrityLevelBefore: 0,
          integrityLevelAfter: 1,
          bannedUntil: new Date("2026-07-21T14:00:00.000Z"),
        },
      },
    },
    readyCheckExpiresAt: OccurredAt,
    activatedAt: OccurredAt,
    closedAt: OccurredAt,
    closedByDiscordId: "player-1",
  });
}

function createAuditDocument(
  input: CreateModerationAuditEventInput,
): ModerationAuditDocument {
  return new ModerationAuditModel({
    _id: "507f191e810c19729de860ea",
    ...input,
    createdAt: CreatedAt,
  });
}

function createDto(): ModerationAuditDto {
  return {
    id: "507f191e810c19729de860ea",
    schemaVersion: 1,
    eventType: "dispute_resolved",
    guildId: "guild-id",
    actorDiscordId: "moderator-id",
    targetDiscordId: "player-0",
    squadId: SquadId,
    decision: "overridden",
    originalOutcome: "win",
    finalOutcome: "loss",
    sanction: {
      action: "misleading_evidence",
      behaviorScoreLoss: 15,
      integrityLevelBefore: 0,
      integrityLevelAfter: 1,
      bannedUntil: new Date("2026-07-21T14:00:00.000Z"),
    },
    evidence: {
      archiveChannelId: "archive-channel",
      archiveMessageId: "archive-message",
    },
    occurredAt: OccurredAt,
    createdAt: CreatedAt,
  };
}

describe("Moderation audit", () => {
  it("records a complete immutable dispute-resolution snapshot", async () => {
    let capturedInput: CreateModerationAuditEventInput | null = null;
    let capturedSession: ClientSession | null = null;
    const session = {} as ClientSession;
    const repository = {
      create: async (
        input: CreateModerationAuditEventInput,
        usedSession: ClientSession,
      ) => {
        capturedInput = input;
        capturedSession = usedSession;
        return createAuditDocument(input);
      },
    } as unknown as ModerationAuditRepository;
    const service = new ModerationAuditService(repository);

    const audit = await service.recordDisputeResolution(
      createResolvedSquad(),
      session,
    );

    assert.equal(capturedSession, session);
    assert.equal(
      capturedInput?.idempotencyKey,
      `dispute-resolution:${SquadId}`,
    );
    assert.equal(capturedInput?.actorDiscordId, "moderator-id");
    assert.equal(capturedInput?.targetDiscordId, "player-0");
    assert.equal(capturedInput?.sanction?.behaviorScoreLoss, 15);
    assert.deepEqual(capturedInput?.evidence, {
      archiveChannelId: "archive-channel",
      archiveMessageId: "archive-message",
    });
    assert.equal(audit.finalOutcome, "loss");
    assert.notEqual(audit.occurredAt, capturedInput?.occurredAt);
  });

  it("queries a bounded guild history with an optional player filter", async () => {
    const input: CreateModerationAuditEventInput = {
      schemaVersion: 1,
      eventType: "dispute_resolved",
      idempotencyKey: `dispute-resolution:${SquadId}`,
      guildId: "guild-id",
      actorDiscordId: "moderator-id",
      targetDiscordId: "player-0",
      squadId: SquadId,
      decision: "voided",
      originalOutcome: "win",
      finalOutcome: null,
      sanction: null,
      evidence: null,
      occurredAt: OccurredAt,
    };
    let capturedQuery: readonly unknown[] = [];
    const repository = {
      findRecentByGuild: async (...args: readonly unknown[]) => {
        capturedQuery = args;
        return [createAuditDocument(input)];
      },
    } as unknown as ModerationAuditRepository;
    const service = new ModerationAuditService(repository);

    const audits = await service.getRecent("guild-id", "player-0");

    assert.deepEqual(capturedQuery, [
      "guild-id",
      "player-0",
      ModerationAuditConfig.recentEventLimit,
    ]);
    assert.equal(audits.length, 1);
    assert.equal(audits[0]?.decision, "voided");
  });

  it("declares unique and history-oriented database indexes", () => {
    const indexes = ModerationAuditModel.schema.indexes();

    assert.equal(
      indexes.some(
        ([fields, options]) =>
          fields.idempotencyKey === 1 &&
          options.name === "unique_moderation_audit_event" &&
          options.unique === true,
      ),
      true,
    );
    assert.equal(
      indexes.some(
        ([fields, options]) =>
          fields.guildId === 1 &&
          fields.targetDiscordId === 1 &&
          fields.occurredAt === -1 &&
          options.name === "player_moderation_audit_history",
      ),
      true,
    );
  });

  it("serializes populated and empty staff audit views", () => {
    const populated = JSON.stringify(
      createModerationAuditView([createDto()], "player-0").toJSON(),
    );
    const empty = JSON.stringify(createModerationAuditView([]).toJSON());

    assert.match(populated, /Moderation Audit/);
    assert.match(populated, /Misleading evidence/);
    assert.match(populated, /archive-message/);
    assert.match(empty, /No audit records found/);
  });
});
