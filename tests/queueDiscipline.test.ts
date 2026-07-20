import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PlayerRoles } from "../src/constants/playerRoles.js";
import { QueueDisciplinePolicy } from "../src/domain/discipline/QueueDisciplinePolicy.js";
import { TeamFormationEngine } from "../src/domain/matchmaking/TeamFormationEngine.js";
import { SquadMapper } from "../src/mappers/SquadMapper.js";
import { SquadModel, type SquadDocument } from "../src/models/SquadModel.js";
import type { PlayerRepository } from "../src/repositories/PlayerRepository.js";
import type { QueueRepository } from "../src/repositories/QueueRepository.js";
import type { SquadRepository } from "../src/repositories/SquadRepository.js";
import { QueueDisciplineService } from "../src/services/QueueDisciplineService.js";
import { QueueService } from "../src/services/QueueService.js";
import type { PlayerService } from "../src/services/PlayerService.js";
import { TeamFormationService } from "../src/services/TeamFormationService.js";
import type { VerifiedResultProcessor } from "../src/services/VerifiedResultProcessor.js";
import { QueueAccessSuspendedError } from "../src/services/errors/QueueAccessSuspendedError.js";

function createReadySquad(
  readyStatuses: readonly ("pending" | "accepted" | "declined")[] = [
    "pending",
    "pending",
    "pending",
    "pending",
    "pending",
  ],
): SquadDocument {
  const now = new Date();

  return new SquadModel({
    guildId: "guild-id",
    sourceQueueKey: `discipline-${now.getTime()}`,
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
      readyStatus: readyStatuses[index] ?? "pending",
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
    readyCheckExpiresAt: new Date(now.getTime() + 30_000),
    activatedAt: null,
    closedAt: null,
    closedByDiscordId: null,
  });
}

describe("Queue discipline", () => {
  it("uses a stronger penalty for missed ready checks", () => {
    const policy = new QueueDisciplinePolicy();
    const now = new Date("2026-07-20T12:00:00.000Z");
    const state = { level: 0, lastPenaltyAt: null };
    const decline = policy.createPenalty("decline", state, now);
    const timeout = policy.createPenalty("timeout", state, now);

    assert.equal(decline.level, 1);
    assert.equal(decline.behaviorScoreLoss, 3);
    assert.equal(decline.cooldownMs, 2 * 60_000);
    assert.equal(timeout.behaviorScoreLoss, 5);
    assert.equal(timeout.cooldownMs, 5 * 60_000);
    assert.ok(timeout.bannedUntil > decline.bannedUntil);
  });

  it("escalates repeated incidents and decays levels over time", () => {
    const policy = new QueueDisciplinePolicy();
    const firstIncidentAt = new Date("2026-07-20T12:00:00.000Z");
    const repeatedIncident = policy.createPenalty(
      "timeout",
      { level: 1, lastPenaltyAt: firstIncidentAt },
      new Date("2026-07-20T13:00:00.000Z"),
    );
    const decayedIncident = policy.createPenalty(
      "timeout",
      { level: 3, lastPenaltyAt: firstIncidentAt },
      new Date("2026-07-24T12:00:00.000Z"),
    );

    assert.equal(repeatedIncident.level, 2);
    assert.equal(repeatedIncident.behaviorScoreLoss, 6);
    assert.equal(repeatedIncident.cooldownMs, 10 * 60_000);
    assert.equal(decayedIncident.level, 1);
    assert.equal(decayedIncident.behaviorScoreLoss, 5);
    assert.equal(decayedIncident.cooldownMs, 5 * 60_000);
  });

  it("never records discipline data for simulated teammates", async () => {
    let repositoryCalled = false;
    const service = new QueueDisciplineService({
      recordReadyCheckAcceptance: async () => {
        repositoryCalled = true;
        return true;
      },
      applyReadyCheckPenalty: async () => {
        repositoryCalled = true;
        return true;
      },
    } as PlayerRepository);

    const accepted = await service.recordAcceptance("simulation:guild-id:1");
    const penalized = await service.applyPenalty(
      "simulation:guild-id:1",
      "timeout",
    );

    assert.equal(accepted, false);
    assert.equal(penalized, false);
    assert.equal(repositoryCalled, false);
  });

  it("penalizes only players who did not answer before timeout", async () => {
    const penalizedIds: string[] = [];
    const service = new QueueDisciplineService({
      findByDiscordId: async () => ({
        queue: { disciplineLevel: 0, lastPenaltyAt: null },
      }),
      applyReadyCheckPenalty: async (discordId: string) => {
        penalizedIds.push(discordId);
        return true;
      },
    } as PlayerRepository);
    const squad = createReadySquad([
      "accepted",
      "accepted",
      "pending",
      "pending",
      "accepted",
    ]);

    const count = await service.applyTimeoutPenalties(SquadMapper.toDto(squad));

    assert.equal(count, 2);
    assert.deepEqual(penalizedIds, ["player-2", "player-3"]);
  });

  it("records a decline only after cancelling the ready check", async () => {
    const squad = createReadySquad();
    const events: string[] = [];
    const squadRepository = {
      findById: async () => squad,
      setParticipantReadyStatus: async (
        _squadId: string,
        _guildId: string,
        discordId: string,
      ) => {
        squad.participants.find(
          (participant) => participant.discordId === discordId,
        )!.readyStatus = "declined";
        events.push("response");
        return squad;
      },
      cancelReadySquad: async () => {
        squad.status = "cancelled";
        events.push("cancelled");
        return squad;
      },
    } as unknown as SquadRepository;
    const discipline = {
      applyPenalty: async () => {
        events.push("penalized");
        return true;
      },
    } as QueueDisciplineService;
    const service = new TeamFormationService(
      {} as QueueRepository,
      squadRepository,
      {} as PlayerService,
      new TeamFormationEngine(),
      {} as VerifiedResultProcessor,
      discipline,
    );

    const result = await service.respondToReadyCheck(
      squad.id,
      squad.guildId,
      "player-0",
      "declined",
    );

    assert.equal(result.status, "cancelled");
    assert.deepEqual(events, ["response", "cancelled", "penalized"]);
  });

  it("reports cancelled and penalized counts from expiration sweeps", async () => {
    const squad = createReadySquad();
    const service = new TeamFormationService(
      {} as QueueRepository,
      {
        cancelExpiredReadyChecks: async () => [squad],
      } as unknown as SquadRepository,
      {} as PlayerService,
      new TeamFormationEngine(),
      {} as VerifiedResultProcessor,
      {
        applyTimeoutPenalties: async () => 5,
      } as QueueDisciplineService,
    );

    assert.deepEqual(await service.cancelExpiredReadyChecks(), {
      cancelledReadyChecks: 1,
      penalizedPlayers: 5,
    });
  });

  it("expires a ready check and applies timeout discipline only once", async () => {
    const squad = createReadySquad();
    squad.readyCheckExpiresAt = new Date(Date.now() - 1_000);
    let cancellationCount = 0;
    let penaltyCount = 0;
    const squadRepository = {
      findById: async () => squad,
      cancelReadySquad: async () => {
        if (squad.status !== "ready_check") {
          return null;
        }

        cancellationCount += 1;
        squad.status = "cancelled";
        squad.closedAt = new Date();
        return squad;
      },
    } as unknown as SquadRepository;
    const service = new TeamFormationService(
      {} as QueueRepository,
      squadRepository,
      {} as PlayerService,
      new TeamFormationEngine(),
      {} as VerifiedResultProcessor,
      {
        applyTimeoutPenalties: async () => {
          penaltyCount += 1;
          return 1;
        },
      } as QueueDisciplineService,
    );

    const firstResult = await service.expireReadyCheck(squad.id);
    const secondResult = await service.expireReadyCheck(squad.id);

    assert.equal(firstResult?.status, "cancelled");
    assert.equal(secondResult?.status, "cancelled");
    assert.equal(cancellationCount, 1);
    assert.equal(penaltyCount, 1);
  });

  it("blocks queue entry while a discipline cooldown is active", async () => {
    const bannedUntil = new Date(Date.now() + 5 * 60_000);
    const queueService = new QueueService(
      {} as QueueRepository,
      {
        findByDiscordId: async () => ({
          preferences: {
            roles: {
              primary: "jungle",
              secondary: "mid",
            },
          },
          queue: { bannedUntil },
        }),
      } as unknown as PlayerRepository,
      {} as SquadRepository,
    );

    await assert.rejects(
      queueService.joinQueue("guild-id", "player-0"),
      QueueAccessSuspendedError,
    );
    assert.equal(
      (await queueService.getActiveSuspension("player-0"))?.getTime(),
      bannedUntil.getTime(),
    );
  });
});
