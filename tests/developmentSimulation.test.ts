import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createSimulationDiscordId,
  isSimulationDiscordId,
} from "../src/constants/developmentSimulation.js";
import type { PlayerDto } from "../src/dto/PlayerDto.js";
import type { SquadDto } from "../src/dto/SquadDto.js";
import type { DevelopmentSimulationRepository } from "../src/repositories/DevelopmentSimulationRepository.js";
import { DevelopmentSimulationService } from "../src/services/DevelopmentSimulationService.js";
import type { PlayerService } from "../src/services/PlayerService.js";
import type { TeamFormationService } from "../src/services/TeamFormationService.js";
import { DevelopmentSimulationUnavailableError } from "../src/services/errors/DevelopmentSimulationUnavailableError.js";

const guildId = "guild-id";
const ownerDiscordId = "owner-id";
const now = new Date("2026-07-20T10:00:00.000Z");

function createOwner(): PlayerDto {
  return {
    id: "player-id",
    discord: {
      id: ownerDiscordId,
      username: "Owner",
    },
    game: {
      ign: "Owner IGN",
      playerId: "123456789",
      serverId: "1234",
    },
    rating: {
      rsr: 1_000,
      confidence: 100,
    },
    statistics: {
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
    },
    behavior: {
      score: 100,
      penalties: 0,
    },
    queue: {
      acceptedMatches: 0,
      declinedMatches: 0,
      bannedUntil: null,
      disciplineLevel: 0,
      lastPenaltyAt: null,
    },
    preferences: {
      roles: {
        primary: "jungle",
        secondary: "mid",
        avoided: null,
      },
    },
    createdAt: now,
    updatedAt: now,
  };
}

function createReadySquad(): SquadDto {
  const simulationIds = Array.from({ length: 4 }, (_value, index) =>
    createSimulationDiscordId(guildId, index + 1),
  );

  return {
    id: "squad-id",
    guildId,
    status: "ready_check",
    captainDiscordId: ownerDiscordId,
    voiceChannelId: null,
    participants: [ownerDiscordId, ...simulationIds].map(
      (discordId, index) => ({
        discordId,
        displayName: index === 0 ? "Owner IGN" : `Test Player ${index}`,
        assignedRole: ["jungle", "exp", "gold", "mid", "roam"][index] as
          "jungle" | "exp" | "gold" | "mid" | "roam",
        roleFit: "primary",
        rsrBefore: 1_000,
        behaviorScore: 100,
        readyStatus: "pending",
      }),
    ),
    metrics: {
      averageRsr: 1_000,
      rsrSpread: 60,
      averageBehaviorScore: 100,
      behaviorSpread: 0,
      rolePenalty: 0,
      totalCost: 60,
      compatibilityScore: 94,
    },
    result: null,
    readyCheckExpiresAt: new Date(now.getTime() + 30_000),
    activatedAt: null,
    closedAt: null,
    closedByDiscordId: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe("Development squad simulation", () => {
  it("refuses to operate against a production database", async () => {
    const service = new DevelopmentSimulationService(
      {} as DevelopmentSimulationRepository,
      {} as PlayerService,
      {} as TeamFormationService,
      {
        enabled: true,
        databaseName: "vora",
      },
    );

    await assert.rejects(
      service.reset(guildId, ownerDiscordId),
      DevelopmentSimulationUnavailableError,
    );
  });

  it("seeds four teammates and auto-accepts only simulated players", async () => {
    const squad = createReadySquad();
    const acceptedIds: string[] = [];
    let seededPlayerCount = 0;
    let queuedIds: readonly string[] = [];

    const repository = {
      seedPlayers: async (players: readonly unknown[]) => {
        seededPlayerCount = players.length;
      },
      replaceQueue: async (_guildId: string, discordIds: readonly string[]) => {
        queuedIds = discordIds;
      },
    } as unknown as DevelopmentSimulationRepository;

    const playerService = {
      getByDiscordId: async () => createOwner(),
    } as unknown as PlayerService;

    const teamFormationService = {
      getActiveSquadForPlayer: async () => null,
      tryCreateSquadFromQueue: async () => squad,
      respondToReadyCheck: async (
        _squadId: string,
        _guildId: string,
        discordId: string,
      ) => {
        acceptedIds.push(discordId);
        const participant = squad.participants.find(
          (candidate) => candidate.discordId === discordId,
        );

        if (participant) {
          (participant as { readyStatus: "accepted" }).readyStatus = "accepted";
        }

        return squad;
      },
    } as unknown as TeamFormationService;

    const service = new DevelopmentSimulationService(
      repository,
      playerService,
      teamFormationService,
      {
        enabled: true,
        databaseName: "vora_development",
      },
    );

    const result = await service.start(guildId, ownerDiscordId);

    assert.equal(seededPlayerCount, 4);
    assert.equal(queuedIds[0], ownerDiscordId);
    assert.equal(queuedIds.length, 5);
    assert.equal(acceptedIds.length, 4);
    assert.ok(acceptedIds.every(isSimulationDiscordId));
    assert.equal(
      result.participants.find(
        (participant) => participant.discordId === ownerDiscordId,
      )?.readyStatus,
      "pending",
    );
  });

  it("auto-confirms enough simulated responses to verify a result", async () => {
    const squad = createReadySquad();
    const confirmedIds: string[] = [];

    squad.status = "result_pending";
    squad.result = {
      outcome: "win",
      reportedByDiscordId: ownerDiscordId,
      reportedAt: now,
      confirmedByDiscordIds: [ownerDiscordId],
      disputedByDiscordIds: [],
      verifiedAt: null,
      statisticsProcessedAt: null,
      ratingChanges: [],
    };

    const teamFormationService = {
      respondToSquadResult: async (
        _squadId: string,
        _guildId: string,
        discordId: string,
      ) => {
        confirmedIds.push(discordId);
        squad.result?.confirmedByDiscordIds.push(discordId);

        if (squad.result?.confirmedByDiscordIds.length === 3) {
          squad.status = "completed";
        }

        return squad;
      },
    } as unknown as TeamFormationService;

    const service = new DevelopmentSimulationService(
      {} as DevelopmentSimulationRepository,
      {} as PlayerService,
      teamFormationService,
      {
        enabled: true,
        databaseName: "vora_test",
      },
    );

    const result = await service.confirmResultIfSimulated(squad);

    assert.equal(confirmedIds.length, 2);
    assert.ok(confirmedIds.every(isSimulationDiscordId));
    assert.equal(result.status, "completed");
  });
});
