import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlSnapshotService } from "../src/community/services/ControlSnapshotService.js";
import type { WebsiteAnalyticsSnapshot } from "../src/community/services/WebsiteAnalyticsService.js";
import type { CommunityDataRepository } from "../src/repositories/CommunityDataRepository.js";
import type {
  ControlDataRepository,
  ControlDataSnapshot,
} from "../src/repositories/ControlDataRepository.js";

describe("Vora Control snapshot", () => {
  it("publishes a private aggregate without player or guild identifiers", async () => {
    const now = new Date("2026-07-29T18:00:00.000Z");
    const communityData = {
      getMatchmakingStatus: async () => ({
        guildId: "private-guild-id",
        coreOnline: true,
        coreHeartbeatAt: new Date("2026-07-29T17:59:45.000Z"),
        queueStatus: "open" as const,
        registrationOpen: true,
        matchmakingOpen: true,
        maintenanceReason: null,
        queuedPlayers: 4,
        readyChecks: 1,
        activeSquads: 2,
        pendingResults: 3,
        disputedResults: 1,
        nextQueueSession: null,
        capturedAt: now,
      }),
    } as Pick<CommunityDataRepository, "getMatchmakingStatus">;
    const controlData: ControlDataSnapshot = {
      registeredPlayers: 20,
      verifiedPlayers: 15,
      pendingVerification: 3,
      rejectedVerification: 2,
      openReports: 2,
      pendingCases: 1,
      openTickets: 4,
      communityHeartbeatAt: new Date("2026-07-29T17:59:40.000Z"),
    };
    const analytics: WebsiteAnalyticsSnapshot = {
      periodDays: 30,
      pageViews: 500,
      landingPageViews: 300,
      getStartedViews: 100,
      discordClicks: 50,
      getStartedDiscordClicks: 25,
      pageToDiscordRate: 10,
      onboardingToDiscordRate: 25,
      topSources: [{ source: "home", clicks: 30 }],
      updatedAt: now,
    };
    const service = new ControlSnapshotService(
      communityData,
      {
        getSnapshot: async () => controlData,
      } as Pick<ControlDataRepository, "getSnapshot">,
      {
        getSnapshot: async () => analytics,
      },
      null,
    );

    const snapshot = await service.create(
      "private-guild-id",
      "Vora Community",
      now,
    );
    const serialized = JSON.stringify(snapshot);

    assert.equal(snapshot.services.core.status, "operational");
    assert.equal(snapshot.services.community.status, "operational");
    assert.equal(snapshot.players.verificationRate, 75);
    assert.equal(snapshot.queue.waitingPlayers, 4);
    assert.equal(snapshot.moderation.openTickets, 4);
    assert.equal(snapshot.website?.pageToDiscordRate, 10);
    assert.doesNotMatch(serialized, /private-guild-id/);
    assert.doesNotMatch(serialized, /discordId|playerId|serverId|evidence/i);
  });

  it("marks stale service heartbeats unavailable", async () => {
    const now = new Date("2026-07-29T18:00:00.000Z");
    const stale = new Date("2026-07-29T17:50:00.000Z");
    const service = new ControlSnapshotService(
      {
        getMatchmakingStatus: async () => ({
          guildId: "guild",
          coreOnline: false,
          coreHeartbeatAt: stale,
          queueStatus: "open" as const,
          registrationOpen: true,
          matchmakingOpen: true,
          maintenanceReason: null,
          queuedPlayers: 0,
          readyChecks: 0,
          activeSquads: 0,
          pendingResults: 0,
          disputedResults: 0,
          nextQueueSession: null,
          capturedAt: now,
        }),
      },
      {
        getSnapshot: async () => ({
          registeredPlayers: 0,
          verifiedPlayers: 0,
          pendingVerification: 0,
          rejectedVerification: 0,
          openReports: 0,
          pendingCases: 0,
          openTickets: 0,
          communityHeartbeatAt: stale,
        }),
      },
      { getSnapshot: async () => null },
      null,
    );

    const snapshot = await service.create("guild", "Vora", now);

    assert.equal(snapshot.services.core.status, "unavailable");
    assert.equal(snapshot.services.community.status, "unavailable");
    assert.equal(snapshot.players.verificationRate, 0);
    assert.equal(snapshot.website, null);
  });
});
