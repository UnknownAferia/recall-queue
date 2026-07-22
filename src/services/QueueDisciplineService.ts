import { isSimulationDiscordId } from "../constants/developmentSimulation.js";
import { logger } from "../config/logger.js";
import {
  QueueDisciplinePolicy,
  type QueueDisciplineReason,
} from "../domain/discipline/QueueDisciplinePolicy.js";
import type { SquadDto } from "../dto/SquadDto.js";
import type { PlayerRepository } from "../repositories/PlayerRepository.js";

export class QueueDisciplineService {
  public constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly policy = new QueueDisciplinePolicy(),
  ) {}

  public async recordAcceptance(discordId: string): Promise<boolean> {
    if (isSimulationDiscordId(discordId)) {
      return false;
    }

    return this.playerRepository.recordReadyCheckAcceptance(discordId);
  }

  public async applyPenalty(
    discordId: string,
    reason: QueueDisciplineReason,
    now = new Date(),
  ): Promise<boolean> {
    if (isSimulationDiscordId(discordId)) {
      return false;
    }

    const player = await this.playerRepository.findByDiscordId(discordId);

    if (!player) {
      return false;
    }

    return this.playerRepository.applyDisciplinePenalty(
      discordId,
      this.policy.createPenalty(
        reason,
        {
          level: player.queue.disciplineLevel ?? 0,
          lastPenaltyAt: player.queue.lastPenaltyAt
            ? new Date(player.queue.lastPenaltyAt)
            : null,
        },
        now,
      ),
    );
  }

  public async applyPenalties(
    discordIds: readonly string[],
    reason: QueueDisciplineReason,
  ): Promise<number> {
    const results = await Promise.allSettled(
      [...new Set(discordIds)].map((discordId) =>
        this.applyPenalty(discordId, reason),
      ),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        logger.error(
          `Unable to apply ${reason} discipline: ${String(result.reason)}`,
        );
      }
    }

    return results.filter(
      (result) => result.status === "fulfilled" && result.value,
    ).length;
  }

  public async applyTimeoutPenalties(squad: SquadDto): Promise<number> {
    const pendingDiscordIds = squad.participants
      .filter((participant) => participant.readyStatus === "pending")
      .map((participant) => participant.discordId);
    const results = await Promise.all(
      pendingDiscordIds.map((discordId) =>
        this.applyPenalty(discordId, "timeout"),
      ),
    );

    return results.filter(Boolean).length;
  }
}
