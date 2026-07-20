import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PlayerRoles } from "../src/constants/playerRoles.js";
import { TeamFormationEngine } from "../src/domain/matchmaking/TeamFormationEngine.js";
import { SquadModel, type SquadDocument } from "../src/models/SquadModel.js";
import type { QueueRepository } from "../src/repositories/QueueRepository.js";
import type { SquadRepository } from "../src/repositories/SquadRepository.js";
import type { PlayerService } from "../src/services/PlayerService.js";
import { TeamFormationService } from "../src/services/TeamFormationService.js";
import type { VerifiedResultProcessor } from "../src/services/VerifiedResultProcessor.js";
import { SquadCaptainRequiredError } from "../src/services/errors/SquadCaptainRequiredError.js";
import { SquadResultAlreadyAnsweredError } from "../src/services/errors/SquadResultAlreadyAnsweredError.js";
import { ResultEvidenceError } from "../src/services/errors/ResultEvidenceError.js";
import type { SquadResultEvidence } from "../src/types/squad.js";

function createEvidence(
  submittedByDiscordId = "player-0",
): SquadResultEvidence {
  return {
    archiveChannelId: "archive-channel",
    archiveMessageId: "archive-message",
    archiveAttachmentId: "archive-attachment",
    fileName: "result.png",
    contentType: "image/png",
    size: 1_024,
    submittedByDiscordId,
    submittedAt: new Date(),
  };
}

function createActiveSquad(): SquadDocument {
  const now = new Date("2026-07-19T12:00:00.000Z");

  return new SquadModel({
    guildId: "guild-id",
    sourceQueueKey: "queue-snapshot-key",
    status: "active",
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
    result: null,
    readyCheckExpiresAt: now,
    activatedAt: now,
    closedAt: null,
    closedByDiscordId: null,
    createdAt: now,
    updatedAt: now,
  });
}

function createService(squad: SquadDocument): TeamFormationService {
  const squadRepository = {
    findById: async () => squad,
    submitResultReport: async (
      _squadId: string,
      _guildId: string,
      captainDiscordId: string,
      outcome: "win" | "loss",
      evidence: SquadResultEvidence,
    ) => {
      squad.status = "result_pending";
      squad.result = {
        outcome,
        reportedByDiscordId: captainDiscordId,
        reportedAt: new Date(),
        confirmedByDiscordIds: [captainDiscordId],
        disputedByDiscordIds: [],
        verifiedAt: null,
        statisticsProcessedAt: null,
        ratingChanges: [],
        moderation: null,
        evidence,
      };

      return squad;
    },
    recordResultResponse: async (
      _squadId: string,
      _guildId: string,
      discordId: string,
      response: "confirmed" | "disputed",
    ) => {
      if (response === "confirmed") {
        squad.result?.confirmedByDiscordIds.push(discordId);
      } else {
        squad.result?.disputedByDiscordIds.push(discordId);
      }

      return squad;
    },
    markResultDisputed: async (
      _squadId: string,
      disputedByDiscordId: string,
    ) => {
      squad.status = "disputed";
      squad.closedAt = new Date();
      squad.closedByDiscordId = disputedByDiscordId;

      return squad;
    },
  } as unknown as SquadRepository;

  const verifiedResultProcessor = {
    process: async () => {
      const processedAt = new Date();
      squad.status = "completed";
      squad.closedAt = processedAt;

      if (squad.result) {
        squad.result.verifiedAt = processedAt;
        squad.result.statisticsProcessedAt = processedAt;
      }

      return squad;
    },
  } as VerifiedResultProcessor;

  return new TeamFormationService(
    {} as QueueRepository,
    squadRepository,
    {} as PlayerService,
    new TeamFormationEngine(),
    verifiedResultProcessor,
  );
}

describe("Squad result verification", () => {
  it("allows only the captain to report the external result", async () => {
    const squad = createActiveSquad();
    const service = createService(squad);

    await assert.rejects(
      service.reportSquadResult(
        squad.id,
        squad.guildId,
        "player-1",
        "win",
        createEvidence("player-1"),
      ),
      SquadCaptainRequiredError,
    );

    const reportedSquad = await service.reportSquadResult(
      squad.id,
      squad.guildId,
      "player-0",
      "win",
      createEvidence(),
    );

    assert.equal(reportedSquad.status, "result_pending");
    assert.equal(reportedSquad.result?.outcome, "win");
    assert.deepEqual(reportedSquad.result?.confirmedByDiscordIds, ["player-0"]);
    assert.equal(
      reportedSquad.result?.evidence?.archiveMessageId,
      "archive-message",
    );
  });

  it("requires evidence archived by the reporting captain", async () => {
    const squad = createActiveSquad();
    const service = createService(squad);

    await assert.rejects(
      service.reportSquadResult(
        squad.id,
        squad.guildId,
        "player-0",
        "win",
        createEvidence("another-player"),
      ),
      ResultEvidenceError,
    );

    assert.equal(squad.status, "active");
    assert.equal(squad.result, null);
  });

  it("completes a result after three squad confirmations", async () => {
    const squad = createActiveSquad();
    const service = createService(squad);

    await service.reportSquadResult(
      squad.id,
      squad.guildId,
      "player-0",
      "loss",
      createEvidence(),
    );

    await service.respondToSquadResult(
      squad.id,
      squad.guildId,
      "player-1",
      "confirmed",
    );

    const completedSquad = await service.respondToSquadResult(
      squad.id,
      squad.guildId,
      "player-2",
      "confirmed",
    );

    assert.equal(completedSquad.status, "completed");
    assert.ok(completedSquad.result?.verifiedAt);
    assert.ok(completedSquad.result?.statisticsProcessedAt);
  });

  it("closes a disputed report without verifying it", async () => {
    const squad = createActiveSquad();
    const service = createService(squad);

    await service.reportSquadResult(
      squad.id,
      squad.guildId,
      "player-0",
      "win",
      createEvidence(),
    );

    const disputedSquad = await service.respondToSquadResult(
      squad.id,
      squad.guildId,
      "player-4",
      "disputed",
    );

    assert.equal(disputedSquad.status, "disputed");
    assert.equal(disputedSquad.result?.verifiedAt, null);
  });

  it("rejects repeated verification responses", async () => {
    const squad = createActiveSquad();
    const service = createService(squad);

    await service.reportSquadResult(
      squad.id,
      squad.guildId,
      "player-0",
      "win",
      createEvidence(),
    );

    await service.respondToSquadResult(
      squad.id,
      squad.guildId,
      "player-1",
      "confirmed",
    );

    await assert.rejects(
      service.respondToSquadResult(
        squad.id,
        squad.guildId,
        "player-1",
        "confirmed",
      ),
      SquadResultAlreadyAnsweredError,
    );
  });
});
