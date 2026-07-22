import type { ClientSession } from "mongoose";

import type { SquadResult } from "../constants/squad.js";
import type {
  SeasonRepository,
  SeasonalPlayerSnapshot,
} from "../repositories/SeasonRepository.js";
import type { SquadRatingChange } from "../types/squad.js";

export class SeasonProgressionService {
  public constructor(private readonly seasonRepository: SeasonRepository) {}

  public async recordVerifiedResult(
    players: readonly SeasonalPlayerSnapshot[],
    ratingChanges: readonly SquadRatingChange[],
    outcome: SquadResult,
    session: ClientSession,
    recordedAt = new Date(),
  ): Promise<number> {
    const activeSeason = await this.seasonRepository.findActive(session);

    if (!activeSeason) {
      return 0;
    }

    if (
      players.length !== ratingChanges.length ||
      new Set(players.map((player) => player.discordId)).size !== players.length
    ) {
      throw new Error(
        "Season progression received an invalid player snapshot.",
      );
    }

    const updatedPlayers = await this.seasonRepository.recordVerifiedResult(
      activeSeason._id,
      players,
      ratingChanges,
      outcome,
      recordedAt,
      session,
    );

    if (updatedPlayers !== players.length) {
      throw new Error(
        `Season progression updated ${updatedPlayers}/${players.length} players.`,
      );
    }

    return updatedPlayers;
  }
}
