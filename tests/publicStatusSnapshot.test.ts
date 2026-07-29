import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { PublicStatusSnapshotService } from "../src/community/services/PublicStatusSnapshotService.js";
import type { PublicCompetitionSnapshot } from "../src/types/publicCompetition.js";

function competition(
  availability: "online" | "paused" | "offline",
  now: Date,
): PublicCompetitionSnapshot {
  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    community: { name: "Vora" },
    service: {
      availability,
      registrationOpen: true,
      matchmakingOpen: availability === "online",
      maintenanceReason: null,
    },
    pool: { waitingPlayers: 0, readyChecks: 0, activeSquads: 0 },
    nextSession: null,
    season: null,
    seasonalLeaderboard: [],
    lifetimeLeaderboard: [],
  };
}

describe("PublicStatusSnapshotService", () => {
  it("records uptime and resolves automatically detected incidents", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vora-status-"));
    const service = new PublicStatusSnapshotService(directory);
    const start = new Date("2026-07-29T10:00:00.000Z");

    await service.publish(competition("offline", start), start);
    const recoveredAt = new Date("2026-07-29T10:05:00.000Z");
    const snapshot = await service.publish(
      competition("online", recoveredAt),
      recoveredAt,
    );

    assert.equal(snapshot?.condition, "operational");
    assert.deepEqual(snapshot?.history, [
      { date: "2026-07-29", checks: 2, successfulChecks: 1 },
    ]);
    assert.equal(snapshot?.incidents.length, 1);
    assert.equal(snapshot?.incidents[0]?.impact, "outage");
    assert.equal(snapshot?.incidents[0]?.resolvedAt, recoveredAt.toISOString());

    const persisted = JSON.parse(
      await readFile(join(directory, "status.json"), "utf8"),
    ) as { schemaVersion: number };
    assert.equal(persisted.schemaVersion, 1);
  });
});
