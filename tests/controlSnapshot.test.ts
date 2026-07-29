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
      pendingOlderThan48Hours: 1,
      openReports: 2,
      pendingCases: 1,
      openTickets: 4,
      communityHeartbeatAt: new Date("2026-07-29T17:59:40.000Z"),
      trends: {
        registrations: { current: 8, previous: 5 },
        verificationSubmissions: { current: 7, previous: 4 },
        verificationApprovals: { current: 6, previous: 3 },
        squadsFormed: { current: 12, previous: 10 },
        verifiedResults: { current: 9, previous: 7 },
        reportsOpened: { current: 2, previous: 1 },
        ticketsOpened: { current: 3, previous: 4 },
      },
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
    assert.equal(snapshot.players.pendingOlderThan48Hours, 1);
    assert.equal(snapshot.queue.waitingPlayers, 4);
    assert.equal(snapshot.queue.nextSession, null);
    assert.equal(snapshot.moderation.openTickets, 4);
    assert.deepEqual(snapshot.trends.registrations, {
      current: 8,
      previous: 5,
    });
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
          pendingOlderThan48Hours: 0,
          openReports: 0,
          pendingCases: 0,
          openTickets: 0,
          communityHeartbeatAt: stale,
          trends: {
            registrations: { current: 0, previous: 0 },
            verificationSubmissions: { current: 0, previous: 0 },
            verificationApprovals: { current: 0, previous: 0 },
            squadsFormed: { current: 0, previous: 0 },
            verifiedResults: { current: 0, previous: 0 },
            reportsOpened: { current: 0, previous: 0 },
            ticketsOpened: { current: 0, previous: 0 },
          },
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

  it("publishes the next queue session without its database identifier", async () => {
    const now = new Date("2026-07-29T18:00:00.000Z");
    const service = new ControlSnapshotService(
      {
        getMatchmakingStatus: async () => ({
          guildId: "guild",
          coreOnline: true,
          coreHeartbeatAt: now,
          queueStatus: "open" as const,
          registrationOpen: true,
          matchmakingOpen: true,
          maintenanceReason: null,
          queuedPlayers: 0,
          readyChecks: 0,
          activeSquads: 0,
          pendingResults: 0,
          disputedResults: 0,
          nextQueueSession: {
            id: "private-session-id",
            title: "Friday Queue",
            startsAt: new Date("2026-07-31T18:00:00.000Z"),
            endsAt: new Date("2026-07-31T20:00:00.000Z"),
            status: "scheduled" as const,
          },
          capturedAt: now,
        }),
      },
      {
        getSnapshot: async () => ({
          registeredPlayers: 0,
          verifiedPlayers: 0,
          pendingVerification: 0,
          rejectedVerification: 0,
          pendingOlderThan48Hours: 0,
          openReports: 0,
          pendingCases: 0,
          openTickets: 0,
          communityHeartbeatAt: now,
          trends: {
            registrations: { current: 0, previous: 0 },
            verificationSubmissions: { current: 0, previous: 0 },
            verificationApprovals: { current: 0, previous: 0 },
            squadsFormed: { current: 0, previous: 0 },
            verifiedResults: { current: 0, previous: 0 },
            reportsOpened: { current: 0, previous: 0 },
            ticketsOpened: { current: 0, previous: 0 },
          },
        }),
      },
      { getSnapshot: async () => null },
      null,
    );

    const snapshot = await service.create("guild", "Vora", now);
    const serialized = JSON.stringify(snapshot);

    assert.deepEqual(snapshot.queue.nextSession, {
      title: "Friday Queue",
      startsAt: "2026-07-31T18:00:00.000Z",
      endsAt: "2026-07-31T20:00:00.000Z",
      status: "scheduled",
    });
    assert.doesNotMatch(serialized, /private-session-id/);
  });
});
