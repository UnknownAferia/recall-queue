import type { PlayerDto } from "../dto/PlayerDto.js";
import type { PlayerDocument } from "../models/PlayerModel.js";

export class PlayerMapper {
  public static toDto(player: PlayerDocument): PlayerDto {
    return {
      id: player.id,

      discord: {
        id: player.discord.id,
        username: player.discord.username,
      },

      game: {
        ign: player.game.ign,
        playerId: player.game.playerId,
        serverId: player.game.serverId,
      },

      rating: {
        rsr: player.rating.rsr,
        confidence: player.rating.confidence,
      },

      statistics: {
        wins: player.statistics.wins,
        losses: player.statistics.losses,
        matchesPlayed: player.statistics.matchesPlayed,
      },

      behavior: {
        score: player.behavior.score,
        penalties: player.behavior.penalties,
      },

      queue: {
        acceptedMatches: player.queue.acceptedMatches,
        declinedMatches: player.queue.declinedMatches,
        bannedUntil: player.queue.bannedUntil
          ? new Date(player.queue.bannedUntil)
          : null,
      },

      preferences: {
        roles: {
          primary: player.preferences?.roles?.primary ?? null,
          secondary:
            player.preferences?.roles?.secondary ?? null,
          avoided: player.preferences?.roles?.avoided ?? null,
        },
      },

      createdAt: new Date(player.createdAt),
      updatedAt: new Date(player.updatedAt),
    };
  }
}