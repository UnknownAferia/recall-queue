import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CustomIds,
  parseSquadLifecycleCustomId,
  parseSquadReadyCheckCustomId,
  parseSquadResultCustomId,
} from "../src/constants/customIds.js";
import { PlayerRoles } from "../src/constants/playerRoles.js";
import type { SquadDto } from "../src/dto/SquadDto.js";
import { createActiveSquadView } from "../src/ui/createActiveSquadView.js";
import { createClosedSquadView } from "../src/ui/createClosedSquadView.js";
import { createReadyCheckView } from "../src/ui/createReadyCheckView.js";
import { createResultVerificationView } from "../src/ui/createResultVerificationView.js";

const squadId = "507f1f77bcf86cd799439011";

function createSquad(status: SquadDto["status"]): SquadDto {
  const now = new Date("2026-07-19T12:00:00.000Z");

  return {
    id: squadId,
    guildId: "guild-id",
    status,
    captainDiscordId: "player-0",
    voiceChannelId: null,
    participants: PlayerRoles.map((role, index) => ({
      discordId: `player-${index}`,
      displayName: `Player ${index}`,
      assignedRole: role,
      roleFit: "primary" as const,
      rsrBefore: 1_000,
      behaviorScore: 100,
      readyStatus:
        status === "active" ? ("accepted" as const) : ("pending" as const),
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
    result:
      status === "result_pending" ||
      status === "completed" ||
      status === "disputed"
        ? {
            outcome: "win",
            reportedByDiscordId: "player-0",
            reportedAt: now,
            confirmedByDiscordIds:
              status === "completed"
                ? ["player-0", "player-1", "player-2"]
                : ["player-0"],
            disputedByDiscordIds: status === "disputed" ? ["player-3"] : [],
            verifiedAt: status === "completed" ? now : null,
            statisticsProcessedAt: status === "completed" ? now : null,
            ratingChanges: [],
          }
        : null,
    readyCheckExpiresAt: new Date(now.getTime() + 30_000),
    activatedAt: status === "active" ? now : null,
    closedAt: status === "completed" || status === "cancelled" ? now : null,
    closedByDiscordId:
      status === "completed" || status === "cancelled" ? "player-0" : null,
    createdAt: now,
    updatedAt: now,
  };
}

describe("Ready-check UI", () => {
  it("creates and parses squad-specific button IDs", () => {
    const acceptCustomId = CustomIds.buttons.squad.readyCheck.accept(squadId);

    const declineCustomId = CustomIds.buttons.squad.readyCheck.decline(squadId);

    assert.deepEqual(parseSquadReadyCheckCustomId(acceptCustomId), {
      action: "accept",
      squadId,
    });

    assert.deepEqual(parseSquadReadyCheckCustomId(declineCustomId), {
      action: "decline",
      squadId,
    });

    assert.equal(
      parseSquadReadyCheckCustomId("squad:ready-check:accept:invalid"),
      null,
    );
  });

  it("creates and parses squad lifecycle button IDs", () => {
    const completeCustomId =
      CustomIds.buttons.squad.lifecycle.complete(squadId);
    const disbandCustomId = CustomIds.buttons.squad.lifecycle.disband(squadId);

    assert.deepEqual(parseSquadLifecycleCustomId(completeCustomId), {
      action: "complete",
      squadId,
    });
    assert.deepEqual(parseSquadLifecycleCustomId(disbandCustomId), {
      action: "disband",
      squadId,
    });
    assert.equal(
      parseSquadLifecycleCustomId("squad:lifecycle:complete:invalid"),
      null,
    );
  });

  it("creates and parses squad result button IDs", () => {
    const reportCustomId = CustomIds.buttons.squad.result.reportWin(squadId);
    const confirmCustomId = CustomIds.buttons.squad.result.confirm(squadId);

    assert.deepEqual(parseSquadResultCustomId(reportCustomId), {
      action: "report-win",
      squadId,
    });
    assert.deepEqual(parseSquadResultCustomId(confirmCustomId), {
      action: "confirm",
      squadId,
    });
    assert.equal(
      parseSquadResultCustomId("squad:result:confirm:invalid"),
      null,
    );
  });

  it("serializes the five-player ready-check view", () => {
    assert.doesNotThrow(() =>
      createReadyCheckView(createSquad("ready_check")).toJSON(),
    );
  });

  it("serializes the active squad view", () => {
    assert.doesNotThrow(() =>
      createActiveSquadView(createSquad("active")).toJSON(),
    );
  });

  it("serializes the result verification view", () => {
    assert.doesNotThrow(() =>
      createResultVerificationView(createSquad("result_pending")).toJSON(),
    );
  });

  it("serializes completed and cancelled squad views", () => {
    assert.doesNotThrow(() =>
      createClosedSquadView(createSquad("completed")).toJSON(),
    );
    assert.doesNotThrow(() =>
      createClosedSquadView(createSquad("cancelled")).toJSON(),
    );
    assert.doesNotThrow(() =>
      createClosedSquadView(createSquad("disputed")).toJSON(),
    );
  });
});
