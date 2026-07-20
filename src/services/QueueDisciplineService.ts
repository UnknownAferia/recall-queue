import { isSimulationDiscordId } from "../constants/developmentSimulation.js";
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

    return this.playerRepository.applyReadyCheckPenalty(
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
