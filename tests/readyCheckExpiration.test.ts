import assert from "node:assert/strict";
import { it } from "node:test";

import { PlayerRoles } from "../src/constants/playerRoles.js";
import type { SquadDto } from "../src/dto/SquadDto.js";
import { ReadyCheckExpirationService } from "../src/services/ReadyCheckExpirationService.js";
import type { TeamFormationService } from "../src/services/TeamFormationService.js";

function createExpiredSquad(): SquadDto {
  const now = new Date();

  return {
    id: "507f1f77bcf86cd799439011",
    guildId: "guild-id",
    status: "ready_check",
    captainDiscordId: "player-0",
    voiceChannelId: null,
    participants: PlayerRoles.map((role, index) => ({
      discordId: `player-${index}`,
      displayName: `Player ${index}`,
      assignedRole: role,
      roleFit: "primary",
      rsrBefore: 1_000,
      behaviorScore: 100,
      readyStatus: "pending",
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
    readyCheckExpiresAt: new Date(now.getTime() - 1_000),
    activatedAt: null,
    closedAt: null,
    closedByDiscordId: null,
    createdAt: now,
    updatedAt: now,
  };
}

it("updates a registered ready-check view when the squad expires", async () => {
  const squad = createExpiredSquad();
  const cancelledSquad: SquadDto = {
    ...squad,
    status: "cancelled",
    closedAt: new Date(),
  };
  const teamFormationService = {
    expireReadyCheck: async () => cancelledSquad,
  } as TeamFormationService;
  const expirationService = new ReadyCheckExpirationService(
    teamFormationService,
    0,
  );

  const editedSquad = await new Promise<SquadDto>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Ready-check view was not updated.")),
      1_000,
    );

    expirationService.schedule(squad, "message-id", async (updatedSquad) => {
      clearTimeout(timeout);
      resolve(updatedSquad);
    });
  });

  assert.equal(editedSquad.status, "cancelled");
});
