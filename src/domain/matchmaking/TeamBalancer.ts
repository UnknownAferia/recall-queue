import { InvalidMatchmakingPoolError } from "./InvalidMatchmakingPoolError.js";
import type {
  BalancedMatch,
  BalancedTeam,
  MatchmakingCandidate,
} from "./MatchmakingCandidate.js";
import { MatchmakingConfig } from "./MatchmakingConfig.js";
import { RoleAllocator } from "./RoleAllocator.js";

interface TeamSolution {
  readonly team: BalancedTeam;
  readonly assignmentKey: string;
}

interface MatchSolution {
  readonly match: BalancedMatch;
  readonly tieBreaker: string;
}

export class TeamBalancer {
  public constructor(private readonly roleAllocator = new RoleAllocator()) {}

  public balance(candidates: readonly MatchmakingCandidate[]): BalancedMatch {
    this.validateCandidates(candidates);

    const orderedCandidates = [...candidates].sort((left, right) =>
      left.id.localeCompare(right.id),
    );

    const assignmentCache = new Map<string, TeamSolution>();
    let bestSolution: MatchSolution | null = null;

    for (const teamAIndexes of this.createTeamACombinations()) {
      const teamAIndexSet = new Set(teamAIndexes);

      const teamACandidates = orderedCandidates.filter((_, index) =>
        teamAIndexSet.has(index),
      );

      const teamBCandidates = orderedCandidates.filter(
        (_, index) => !teamAIndexSet.has(index),
      );

      const teamA = this.solveTeam(teamACandidates, assignmentCache);

      const teamB = this.solveTeam(teamBCandidates, assignmentCache);

      const solution = this.createMatchSolution(teamA, teamB);

      if (!bestSolution || this.isBetterSolution(solution, bestSolution)) {
        bestSolution = solution;
      }
    }

    if (!bestSolution) {
      throw new InvalidMatchmakingPoolError(
        "Unable to create balanced teams from the supplied players.",
      );
    }

    return bestSolution.match;
  }

  private validateCandidates(
    candidates: readonly MatchmakingCandidate[],
  ): void {
    if (candidates.length !== MatchmakingConfig.playersPerMatch) {
      throw new InvalidMatchmakingPoolError(
        `Exactly ${MatchmakingConfig.playersPerMatch} players are required to create an internal match.`,
      );
    }

    const playerIds = new Set<string>();

    for (const candidate of candidates) {
      if (!candidate.id.trim() || playerIds.has(candidate.id)) {
        throw new InvalidMatchmakingPoolError(
          "Internal matchmaking requires ten unique players.",
        );
      }

      playerIds.add(candidate.id);

      if (!Number.isFinite(candidate.rsr) || candidate.rsr < 0) {
        throw new InvalidMatchmakingPoolError(
          `Invalid RSR value for player ${candidate.id}.`,
        );
      }

      if (
        !Number.isFinite(candidate.behaviorScore) ||
        candidate.behaviorScore < 0 ||
        candidate.behaviorScore > 100
      ) {
        throw new InvalidMatchmakingPoolError(
          `Invalid behavior score for player ${candidate.id}.`,
        );
      }
    }
  }

  private createTeamACombinations(): number[][] {
    const combinations: number[][] = [];

    const visit = (nextIndex: number, selected: number[]): void => {
      if (selected.length === MatchmakingConfig.playersPerTeam) {
        combinations.push([...selected]);
        return;
      }

      const remainingSlots = MatchmakingConfig.playersPerTeam - selected.length;

      for (
        let index = nextIndex;
        index <= MatchmakingConfig.playersPerMatch - remainingSlots;
        index += 1
      ) {
        selected.push(index);
        visit(index + 1, selected);
        selected.pop();
      }
    };

    visit(1, [0]);

    return combinations;
  }

  private solveTeam(
    candidates: readonly MatchmakingCandidate[],
    cache: Map<string, TeamSolution>,
  ): TeamSolution {
    const cacheKey = candidates
      .map((candidate) => candidate.id)
      .sort()
      .join("|");

    const cachedSolution = cache.get(cacheKey);

    if (cachedSolution) {
      return cachedSolution;
    }

    const team = this.roleAllocator.allocate(candidates);
    const solution: TeamSolution = {
      team,
      assignmentKey: team.assignments
        .map(
          (assignment) =>
            `${assignment.candidate.id}:${assignment.assignedRole}`,
        )
        .join("|"),
    };

    cache.set(cacheKey, solution);

    return solution;
  }

  private createMatchSolution(
    teamASolution: TeamSolution,
    teamBSolution: TeamSolution,
  ): MatchSolution {
    const teamA = teamASolution.team;
    const teamB = teamBSolution.team;

    const ratingDifference = Math.abs(teamA.averageRsr - teamB.averageRsr);

    const behaviorDifference = Math.abs(
      teamA.averageBehaviorScore - teamB.averageBehaviorScore,
    );

    const totalRolePenalty = teamA.rolePenalty + teamB.rolePenalty;

    const totalCost =
      ratingDifference * MatchmakingConfig.ratingDifferenceWeight +
      behaviorDifference * MatchmakingConfig.behaviorDifferenceWeight +
      totalRolePenalty;

    const teamAWinProbability =
      1 /
      (1 +
        10 **
          ((teamB.averageRsr - teamA.averageRsr) /
            MatchmakingConfig.ratingProbabilityScale));

    return {
      match: {
        teamA,
        teamB,
        ratingDifference,
        behaviorDifference,
        totalRolePenalty,
        totalCost,
        qualityScore: Math.max(
          0,
          Math.min(100, 100 - totalCost / MatchmakingConfig.qualityCostScale),
        ),
        teamAWinProbability,
        teamBWinProbability: 1 - teamAWinProbability,
      },
      tieBreaker: [
        teamASolution.assignmentKey,
        teamBSolution.assignmentKey,
      ].join("||"),
    };
  }

  private isBetterSolution(
    candidate: MatchSolution,
    currentBest: MatchSolution,
  ): boolean {
    if (candidate.match.totalCost !== currentBest.match.totalCost) {
      return candidate.match.totalCost < currentBest.match.totalCost;
    }

    if (
      candidate.match.ratingDifference !== currentBest.match.ratingDifference
    ) {
      return (
        candidate.match.ratingDifference < currentBest.match.ratingDifference
      );
    }

    if (
      candidate.match.totalRolePenalty !== currentBest.match.totalRolePenalty
    ) {
      return (
        candidate.match.totalRolePenalty < currentBest.match.totalRolePenalty
      );
    }

    return candidate.tieBreaker < currentBest.tieBreaker;
  }
}
