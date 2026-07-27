import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PublicCompetitionSnapshotService } from "../src/community/services/PublicCompetitionSnapshotService.js";
import type { PlayerDocument } from "../src/models/PlayerModel.js";
import type { CommunityDataRepository } from "../src/repositories/CommunityDataRepository.js";
import type { SeasonService } from "../src/services/SeasonService.js";

describe("Public competition snapshot", () => {
  it("publishes only sanitized competition data", async () => {
    const now = new Date("2026-07-27T18:00:00.000Z");
    const player = {
      id: "private-player-document-id",
      discord: {
        id: "123456789012345678",
        username: "private-discord-name",
      },
      game: {
        ign: "Public IGN",
        playerId: "987654321",
        serverId: "9499",
      },
      rating: { rsr: 1_525, confidence: 88 },
      statistics: { wins: 18, losses: 12, matchesPlayed: 30 },
      behavior: {
        score: 100,
        penalties: 0,
        integrityLevel: 0,
        lastIntegritySanctionAt: null,
      },
      queue: {
        acceptedMatches: 8,
        declinedMatches: 1,
        bannedUntil: null,
        disciplineLevel: 0,
        lastPenaltyAt: null,
      },
      verification: {
        status: "verified",
        submittedAt: now,
        reviewedAt: now,
        reviewedByDiscordId: "staff-id",
        rejectionReason: null,
      },
      preferences: {
        roles: {
          primary: "jungle",
          secondary: "mid",
          avoided: "roam",
        },
      },
      createdAt: now,
      updatedAt: now,
    } as unknown as PlayerDocument;
    const data = {
      findHighestRated: async () => [player],
      getMatchmakingStatus: async () => ({
        guildId: "private-guild-id",
        coreOnline: true,
        coreHeartbeatAt: now,
        queueStatus: "open" as const,
        registrationOpen: true,
        matchmakingOpen: true,
        maintenanceReason: null,
        queuedPlayers: 3,
        readyChecks: 1,
        activeSquads: 2,
        pendingResults: 0,
        disputedResults: 0,
        capturedAt: now,
      }),
    } as unknown as CommunityDataRepository;
    const seasons = {
      getLeaderboard: async () => null,
    } as unknown as SeasonService;
    const service = new PublicCompetitionSnapshotService(
      data,
      seasons,
      null,
    );

    const snapshot = await service.create(
      "private-guild-id",
      "Vora | Mobile Legends",
      now,
    );
    const serialized = JSON.stringify(snapshot);

    assert.equal(snapshot.service.availability, "online");
    assert.equal(snapshot.pool.waitingPlayers, 3);
    assert.equal(snapshot.lifetimeLeaderboard[0]?.division, "Diamond");
    assert.equal(snapshot.lifetimeLeaderboard[0]?.winRate, 60);
    assert.match(serialized, /Public IGN/);
    assert.doesNotMatch(serialized, /private-guild-id/);
    assert.doesNotMatch(serialized, /123456789012345678/);
    assert.doesNotMatch(serialized, /private-discord-name/);
    assert.doesNotMatch(serialized, /987654321/);
    assert.doesNotMatch(serialized, /9499/);
  });
});
