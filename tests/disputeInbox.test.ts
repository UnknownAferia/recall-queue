import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PlayerRoles } from "../src/constants/playerRoles.js";
import { SquadModel, type SquadDocument } from "../src/models/SquadModel.js";
import type { SquadRepository } from "../src/repositories/SquadRepository.js";
import { DisputeModerationService } from "../src/services/DisputeModerationService.js";
import { InvalidDisputeReferenceError } from "../src/services/errors/InvalidDisputeReferenceError.js";
import { createDisputeInboxView } from "../src/ui/createDisputeInboxView.js";

function createDisputedSquad(): SquadDocument {
  const now = new Date("2026-07-20T12:00:00.000Z");

  return new SquadModel({
    _id: "507f1f77bcf86cd799439011",
    guildId: "guild-id",
    sourceQueueKey: "disputed-source",
    status: "disputed",
    captainDiscordId: "player-0",
    voiceChannelId: null,
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
    },
    readyCheckExpiresAt: now,
    activatedAt: now,
    closedAt: now,
    closedByDiscordId: "player-1",
    createdAt: now,
    updatedAt: now,
  });
}

describe("Dispute review inbox", () => {
  it("loads and serializes disputed squads for staff", async () => {
    const squad = createDisputedSquad();
    const service = new DisputeModerationService({
      findDisputedByGuild: async () => [squad],
    } as unknown as SquadRepository);

    const inbox = await service.getInbox("guild-id");

    assert.equal(inbox.length, 1);
    assert.equal(inbox[0]?.status, "disputed");
    assert.doesNotThrow(() => createDisputeInboxView(inbox).toJSON());
  });

  it("serializes an empty inbox", () => {
    assert.doesNotThrow(() => createDisputeInboxView([]).toJSON());
  });

  it("rejects invalid and unavailable squad references", async () => {
    const repository = {
      findDisputedById: async () => null,
    } as unknown as SquadRepository;
    const service = new DisputeModerationService(repository);

    await assert.rejects(
      service.getInbox("guild-id", "invalid"),
      InvalidDisputeReferenceError,
    );
    await assert.rejects(
      service.getInbox("guild-id", "507f1f77bcf86cd799439011"),
      InvalidDisputeReferenceError,
    );
  });
});
