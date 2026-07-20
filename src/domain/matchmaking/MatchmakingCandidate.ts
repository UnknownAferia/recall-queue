import type { PlayerRole } from "../../constants/playerRoles.js";

export interface MatchmakingCandidate {
  readonly id: string;
  readonly displayName: string;
  readonly rsr: number;
  readonly behaviorScore: number;
  readonly roles: {
    readonly primary: PlayerRole | null;
    readonly secondary: PlayerRole | null;
    readonly avoided: PlayerRole | null;
  };
}

export type RoleFit =
  | "primary"
  | "secondary"
  | "flexible"
  | "avoided";

export interface MatchmakingAssignment {
  readonly candidate: MatchmakingCandidate;
  readonly assignedRole: PlayerRole;
  readonly roleFit: RoleFit;
  readonly rolePenalty: number;
}

export interface BalancedTeam {
  readonly assignments: readonly MatchmakingAssignment[];
  readonly totalRsr: number;
  readonly averageRsr: number;
  readonly averageBehaviorScore: number;
  readonly rolePenalty: number;
}

export interface BalancedMatch {
  readonly teamA: BalancedTeam;
  readonly teamB: BalancedTeam;
  readonly ratingDifference: number;
  readonly behaviorDifference: number;
  readonly totalRolePenalty: number;
  readonly totalCost: number;
  readonly qualityScore: number;
  readonly teamAWinProbability: number;
  readonly teamBWinProbability: number;
}
