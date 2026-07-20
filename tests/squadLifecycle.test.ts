import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PlayerRoles } from "../src/constants/playerRoles.js";
import { TeamFormationEngine } from "../src/domain/matchmaking/TeamFormationEngine.js";
import { SquadModel, type SquadDocument } from "../src/models/SquadModel.js";
import type { QueueRepository } from "../src/repositories/QueueRepository.js";
import type { SquadRepository } from "../src/repositories/SquadRepository.js";
import type { PlayerService } from "../src/services/PlayerService.js";
import { TeamFormationService } from "../src/services/TeamFormationService.js";
import type { VerifiedResultProcessor } from "../src/services/VerifiedResultProcessor.js";
import { ActiveSquadParticipantRequiredError } from "../src/services/errors/ActiveSquadParticipantRequiredError.js";
import { SquadCaptainRequiredError } from "../src/services/errors/SquadCaptainRequiredError.js";

function createActiveSquad(): SquadDocument {
  const now = new Date("2026-07-19T12:00:00.000Z");

  return new SquadModel({
    guildId: "guild-id",
    sourceQueueKey: "queue-snapshot-key",
    status: "active",
    captainDiscordId: "player-0",
    voiceChannelId: null,
    participants: PlayerRoles.map((role, index) => ({
      discordId: `player-${index}`,
      displayName: `Player ${index}`,
      assignedRole: role,
      roleFit: "primary" as const,
      rsrBefore: 1_000,
      behaviorScore: 100,
      readyStatus: "accepted" as const,
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
    readyCheckExpiresAt: now,
    activatedAt: now,
    closedAt: null,
    closedByDiscordId: null,
    createdAt: now,
    updatedAt: now,
  });
}

function createService(squad: SquadDocument): TeamFormationService {
  const squadRepository = {
    findById: async () => squad,
    closeActiveSquad: async (
      _squadId: string,
      _guildId: string,
      status: "completed" | "cancelled",
      closedByDiscordId: string,
    ) => {
      squad.status = status;
      squad.closedAt = new Date();
      squad.closedByDiscordId = closedByDiscordId;

      return squad;
    },
  } as unknown as SquadRepository;

  return new TeamFormationService(
    {} as QueueRepository,
    squadRepository,
    {} as PlayerService,
    new TeamFormationEngine(),
    {} as VerifiedResultProcessor,
  );
}

describe("Squad lifecycle", () => {
  it("allows only the captain to finish an active session", async () => {
    const squad = createActiveSquad();
    const service = createService(squad);

    await assert.rejects(
      service.closeActiveSquad(
        squad.id,
        squad.guildId,
        "player-1",
        "completed",
      ),
      SquadCaptainRequiredError,
    );

    const completedSquad = await service.closeActiveSquad(
      squad.id,
      squad.guildId,
      "player-0",
      "completed",
    );

    assert.equal(completedSquad.status, "completed");
    assert.equal(completedSquad.closedByDiscordId, "player-0");
  });

  it("allows any member to disband an unusable squad", async () => {
    const squad = createActiveSquad();
    const service = createService(squad);

    const cancelledSquad = await service.closeActiveSquad(
      squad.id,
      squad.guildId,
      "player-3",
      "cancelled",
    );

    assert.equal(cancelledSquad.status, "cancelled");
    assert.equal(cancelledSquad.closedByDiscordId, "player-3");
  });

  it("prevents outsiders from managing a squad", async () => {
    const squad = createActiveSquad();
    const service = createService(squad);

    await assert.rejects(
      service.closeActiveSquad(
        squad.id,
        squad.guildId,
        "outsider",
        "cancelled",
      ),
      ActiveSquadParticipantRequiredError,
    );
  });
});
