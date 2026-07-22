import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { OperationalControlService } from "../src/services/OperationalControlService.js";
import { PlayerService } from "../src/services/PlayerService.js";
import { QueueService } from "../src/services/QueueService.js";
import { SystemMaintenanceError } from "../src/services/errors/SystemMaintenanceError.js";
import { createLaunchAuditView, createSystemStatusView } from "../src/ui/createSystemOperationsView.js";

describe("Operational control", () => {
  it("persists scoped maintenance changes", async () => {
    const document = (value: Record<string, unknown>) => ({ toObject: () => value });
    let state = {
      key: "global" as const,
      registrationOpen: true,
      matchmakingOpen: true,
      reason: null as string | null,
      changedByDiscordId: null as string | null,
      changedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const repository = {
      getOrCreate: async () => document(state),
      setAccess: async (
        scope: "all" | "registration" | "matchmaking",
        open: boolean,
        actorDiscordId: string,
        reason: string,
      ) => {
        state = {
          ...state,
          registrationOpen:
            scope === "all" || scope === "registration" ? open : state.registrationOpen,
          matchmakingOpen:
            scope === "all" || scope === "matchmaking" ? open : state.matchmakingOpen,
          reason,
          changedByDiscordId: actorDiscordId,
        };
        return document(state);
      },
    };
    const service = new OperationalControlService(repository as never);
    const updated = await service.setAccess(
      "matchmaking",
      false,
      "owner-id",
      "Emergency maintenance",
    );
    assert.equal(updated.registrationOpen, true);
    assert.equal(updated.matchmakingOpen, false);
    await assert.rejects(() => service.assertMatchmakingOpen(), SystemMaintenanceError);
  });

  it("blocks registration and queue entry before repository mutation", async () => {
    let mutations = 0;
    const player = new PlayerService(
      { existsByDiscordId: async () => (mutations += 1) } as never,
      {
        assertRegistrationOpen: async () => {
          throw new SystemMaintenanceError("registration");
        },
      } as never,
    );
    await assert.rejects(
      () =>
        player.registerPlayer({
          discordId: "1",
          discordUsername: "user",
          ign: "Player",
          playerId: "1234",
          serverId: "1",
        }),
      SystemMaintenanceError,
    );
    const queue = new QueueService(
      {} as never,
      { findByDiscordId: async () => (mutations += 1) } as never,
      {} as never,
      {
        assertMatchmakingOpen: async () => {
          throw new SystemMaintenanceError("matchmaking");
        },
      } as never,
    );
    await assert.rejects(() => queue.joinQueue("guild", "player"), SystemMaintenanceError);
    assert.equal(mutations, 0);
  });

  it("serializes status and launch audit views", () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    const state = {
      key: "global" as const,
      registrationOpen: true,
      matchmakingOpen: false,
      reason: "Maintenance",
      changedByDiscordId: "owner",
      changedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const status = createSystemStatusView({
      state,
      databaseLatencyMs: 12,
      coreHeartbeatAt: now,
      communityHeartbeatAt: now,
      queuedPlayers: 2,
      readyChecks: 1,
      activeSquads: 0,
      pendingResults: 0,
      disputedResults: 0,
      pendingVerifications: 1,
      staleVerifications: 0,
      capturedAt: now,
    }).toJSON();
    const audit = createLaunchAuditView({
      capturedAt: now,
      checks: [{ name: "Database", level: "pass", detail: "Healthy" }],
    }).toJSON();
    assert.match(JSON.stringify(status), /Matchmaking.*Maintenance/);
    assert.match(JSON.stringify(audit), /Ready for Alpha/);
  });
});
