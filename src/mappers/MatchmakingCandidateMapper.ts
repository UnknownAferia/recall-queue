import { normalizePlayerRole } from "../constants/playerRoles.js";
import type { PlayerDto } from "../dto/PlayerDto.js";
import type { MatchmakingCandidate } from "../domain/matchmaking/MatchmakingCandidate.js";

export class MatchmakingCandidateMapper {
  public static fromPlayer(player: PlayerDto): MatchmakingCandidate {
    return {
      id: player.discord.id,
      displayName: player.game.ign,
      rsr: player.rating.rsr,
      behaviorScore: player.behavior.score,
      roles: {
        primary: normalizePlayerRole(player.preferences.roles.primary),
        secondary: normalizePlayerRole(player.preferences.roles.secondary),
        avoided: normalizePlayerRole(player.preferences.roles.avoided),
      },
    };
  }
}
