import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PlayerRoles } from "../src/constants/playerRoles.js";
import { SquadMapper } from "../src/mappers/SquadMapper.js";
import { SquadModel, type SquadDocument } from "../src/models/SquadModel.js";
import type { SquadRepository } from "../src/repositories/SquadRepository.js";
import type { QueueDisciplineService } from "../src/services/QueueDisciplineService.js";
import { ResultLifecycleExpirationService } from "../src/services/ResultLifecycleExpirationService.js";
import { createClosedSquadView } from "../src/ui/createClosedSquadView.js";

function createExpiredSquad(
  reason: "result_report_timeout" | "result_confirmation_timeout",
): SquadDocument {
  const now = new Date("2026-07-22T12:00:00.000Z");
  const participantIds = PlayerRoles.map((_, index) => `player-${index}`);
  const reportExpired = reason === "result_report_timeout";

  return new SquadModel({
    guildId: "guild-id",
    sourceQueueKey: `lifecycle-${reason}`,
    status: reportExpired ? "cancelled" : "disputed",
    captainDiscordId: participantIds[0],
    voiceChannelId: "voice-id",
    participants: PlayerRoles.map((role, index) => ({
      discordId: participantIds[index],
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
    result: reportExpired
      ? null
      : {
          outcome: "win",
          reportedByDiscordId: participantIds[0],
          reportedAt: new Date(now.getTime() - 31 * 60_000),
          confirmedByDiscordIds: participantIds.slice(0, 3),
          disputedByDiscordIds: [],
          verifiedAt: null,
          statisticsProcessedAt: null,
          ratingChanges: [],
          moderation: null,
          evidence: null,
        },
    readyCheckExpiresAt: new Date(now.getTime() - 3 * 60 * 60_000),
    activatedAt: new Date(now.getTime() - 2 * 60 * 60_000),
    resultReportExpiresAt: null,
    resultConfirmationExpiresAt: null,
    lifecycleIncident: {
      reason,
      responsibleDiscordIds: reportExpired
        ? [participantIds[0]]
        : participantIds.slice(3),
      occurredAt: now,
    },
    closedAt: now,
    closedByDiscordId: null,
  });
}

describe("Result lifecycle expiration", () => {
  it("penalizes only players recorded as responsible for expired cases", async () => {
    const reportTimeout = createExpiredSquad("result_report_timeout");
    const confirmationTimeout = createExpiredSquad(
      "result_confirmation_timeout",
    );
    const penalties: { ids: readonly string[]; reason: string }[] = [];
    const service = new ResultLifecycleExpirationService(
      {
        expireOverdueResultReports: async () => [reportTimeout],
        expireOverdueResultConfirmations: async () => [confirmationTimeout],
      } as unknown as SquadRepository,
      {
        applyPenalties: async (ids: readonly string[], reason: string) => {
          penalties.push({ ids, reason });
          return ids.length;
        },
      } as QueueDisciplineService,
    );

    const result = await service.expireOverdueCases(
      new Date("2026-07-22T12:00:00.000Z"),
    );

    assert.equal(result.expiredSquads.length, 2);
    assert.equal(result.penalizedPlayers, 3);
    assert.deepEqual(penalties, [
      { ids: ["player-0"], reason: "result_report_timeout" },
      {
        ids: ["player-3", "player-4"],
        reason: "result_confirmation_timeout",
      },
    ]);
  });

  it("rejects lifecycle incidents that name squad outsiders", async () => {
    const squad = createExpiredSquad("result_report_timeout");
    squad.lifecycleIncident!.responsibleDiscordIds = ["outsider"];

    await assert.rejects(squad.validate(), /Lifecycle incidents/);
  });

  it("shows the automatic resolution and responsible players", () => {
    const squad = SquadMapper.toDto(
      createExpiredSquad("result_confirmation_timeout"),
    );
    const serialized = JSON.stringify(createClosedSquadView(squad).toJSON());

    assert.match(serialized, /CONFIRMATION DEADLINE EXPIRED/i);
    assert.match(serialized, /Responsible/);
    assert.match(serialized, /<@player-3>/);
    assert.match(serialized, /<@player-4>/);
  });
});
