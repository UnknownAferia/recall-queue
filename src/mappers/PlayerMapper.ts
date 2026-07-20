import { normalizePlayerRole } from "../constants/playerRoles.js";
import { calculateEffectiveDisciplineLevel } from "../domain/discipline/QueueDisciplinePolicy.js";
import { calculateEffectiveIntegrityLevel } from "../domain/integrity/IntegritySanctionPolicy.js";
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
        integrityLevel: calculateEffectiveIntegrityLevel({
          level: player.behavior.integrityLevel ?? 0,
          lastSanctionAt: player.behavior.lastIntegritySanctionAt
            ? new Date(player.behavior.lastIntegritySanctionAt)
            : null,
        }),
        lastIntegritySanctionAt: player.behavior.lastIntegritySanctionAt
          ? new Date(player.behavior.lastIntegritySanctionAt)
          : null,
      },

      queue: {
        acceptedMatches: player.queue.acceptedMatches,
        declinedMatches: player.queue.declinedMatches,
        bannedUntil: player.queue.bannedUntil
          ? new Date(player.queue.bannedUntil)
          : null,
        disciplineLevel: calculateEffectiveDisciplineLevel({
          level: player.queue.disciplineLevel ?? 0,
          lastPenaltyAt: player.queue.lastPenaltyAt
            ? new Date(player.queue.lastPenaltyAt)
            : null,
        }),
        lastPenaltyAt: player.queue.lastPenaltyAt
          ? new Date(player.queue.lastPenaltyAt)
          : null,
      },

      preferences: {
        roles: {
          primary: normalizePlayerRole(player.preferences?.roles?.primary),
          secondary: normalizePlayerRole(player.preferences?.roles?.secondary),
          avoided: normalizePlayerRole(player.preferences?.roles?.avoided),
        },
      },

      createdAt: new Date(player.createdAt),
      updatedAt: new Date(player.updatedAt),
    };
  }
}
