import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPublicHealthReport,
  publicHealthHttpStatus,
} from "../app/lib/publicHealth.ts";

const now = new Date("2026-07-27T18:00:00.000Z");

function snapshot({
  generatedAt = now.toISOString(),
  availability = "online",
} = {}) {
  return {
    schemaVersion: 1,
    generatedAt,
    community: { name: "Vora" },
    service: {
      availability,
      registrationOpen: true,
      matchmakingOpen: availability === "online",
      maintenanceReason: null,
    },
    pool: {
      waitingPlayers: 0,
      readyChecks: 0,
      activeSquads: 0,
    },
    nextSession: null,
    season: null,
    seasonalLeaderboard: [],
    lifetimeLeaderboard: [],
  };
}

describe("Public health", () => {
  it("reports all services operational from a current online snapshot", () => {
    const report = createPublicHealthReport(
      { snapshot: snapshot(), stale: false },
      now,
    );

    assert.equal(report.status, "operational");
    assert.equal(report.services.website, "operational");
    assert.equal(report.services.community, "operational");
    assert.equal(report.services.core, "operational");
    assert.equal(report.matchmaking, "open");
    assert.equal(publicHealthHttpStatus(report), 200);
  });

  it("keeps planned matchmaking pauses healthy", () => {
    const report = createPublicHealthReport(
      { snapshot: snapshot({ availability: "paused" }), stale: false },
      now,
    );

    assert.equal(report.status, "operational");
    assert.equal(report.services.core, "operational");
    assert.equal(report.matchmaking, "paused");
    assert.equal(publicHealthHttpStatus(report), 200);
  });

  it("returns a monitoring failure when Core is offline", () => {
    const report = createPublicHealthReport(
      { snapshot: snapshot({ availability: "offline" }), stale: false },
      now,
    );

    assert.equal(report.status, "degraded");
    assert.equal(report.services.community, "operational");
    assert.equal(report.services.core, "unavailable");
    assert.equal(report.matchmaking, "unavailable");
    assert.equal(publicHealthHttpStatus(report), 503);
  });

  it("does not claim Core health from a stale Community snapshot", () => {
    const report = createPublicHealthReport(
      {
        snapshot: snapshot({
          generatedAt: "2026-07-27T17:57:59.999Z",
        }),
        stale: false,
      },
      now,
    );

    assert.equal(report.status, "degraded");
    assert.equal(report.services.community, "unavailable");
    assert.equal(report.services.core, "unknown");
    assert.equal(report.matchmaking, "unknown");
    assert.equal(publicHealthHttpStatus(report), 503);
  });

  it("fails safely before the first public snapshot exists", () => {
    const report = createPublicHealthReport(
      { snapshot: null, stale: true },
      now,
    );

    assert.equal(report.status, "degraded");
    assert.equal(report.lastPublishedAt, null);
    assert.equal(report.services.website, "operational");
    assert.equal(report.services.community, "unavailable");
    assert.equal(report.services.core, "unknown");
    assert.equal(publicHealthHttpStatus(report), 503);
  });
});
