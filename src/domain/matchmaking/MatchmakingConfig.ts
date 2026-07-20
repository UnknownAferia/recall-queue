import { PlayerRoles } from "../../constants/playerRoles.js";

export const MatchmakingConfig = Object.freeze({
  playersPerMatch: 10,
  playersPerTeam: 5,
  roles: PlayerRoles,

  rolePenalties: Object.freeze({
    primary: 0,
    secondary: 20,
    flexible: 80,
    avoided: 240,
  }),

  ratingDifferenceWeight: 1,
  behaviorDifferenceWeight: 2,
  qualityCostScale: 10,
  ratingProbabilityScale: 400,
});
