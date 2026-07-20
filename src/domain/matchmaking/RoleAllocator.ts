import { isPlayerRole, type PlayerRole } from "../../constants/playerRoles.js";
import { InvalidMatchmakingPoolError } from "./InvalidMatchmakingPoolError.js";
import type {
  BalancedTeam,
  MatchmakingAssignment,
  MatchmakingCandidate,
  RoleFit,
} from "./MatchmakingCandidate.js";
import { MatchmakingConfig } from "./MatchmakingConfig.js";

function createRolePermutations(): readonly (readonly PlayerRole[])[] {
  const permutations: PlayerRole[][] = [];

  const visit = (
    remainingRoles: readonly PlayerRole[],
    selectedRoles: PlayerRole[],
  ): void => {
    if (remainingRoles.length === 0) {
      permutations.push([...selectedRoles]);
      return;
    }

    for (const role of remainingRoles) {
      selectedRoles.push(role);
      visit(
        remainingRoles.filter((remainingRole) => remainingRole !== role),
        selectedRoles,
      );
      selectedRoles.pop();
    }
  };

  visit(MatchmakingConfig.roles, []);

  return permutations;
}

const RolePermutations = createRolePermutations();

export class RoleAllocator {
  public allocate(candidates: readonly MatchmakingCandidate[]): BalancedTeam {
    this.validateCandidates(candidates);

    const orderedCandidates = [...candidates].sort((left, right) =>
      left.id.localeCompare(right.id),
    );

    let bestAssignments: MatchmakingAssignment[] | null = null;
    let bestPenalty = Number.POSITIVE_INFINITY;
    let bestAssignmentKey = "";

    for (const roleOrder of RolePermutations) {
      const assignments = orderedCandidates.map((candidate, index) =>
        this.createAssignment(candidate, roleOrder[index]!),
      );

      const penalty = assignments.reduce(
        (total, assignment) => total + assignment.rolePenalty,
        0,
      );

      const assignmentKey = assignments
        .map(
          (assignment) =>
            `${assignment.candidate.id}:${assignment.assignedRole}`,
        )
        .join("|");

      if (
        penalty < bestPenalty ||
        (penalty === bestPenalty && assignmentKey < bestAssignmentKey)
      ) {
        bestAssignments = assignments;
        bestPenalty = penalty;
        bestAssignmentKey = assignmentKey;
      }
    }

    if (!bestAssignments) {
      throw new InvalidMatchmakingPoolError("Unable to allocate team roles.");
    }

    const totalRsr = orderedCandidates.reduce(
      (total, candidate) => total + candidate.rsr,
      0,
    );

    const totalBehavior = orderedCandidates.reduce(
      (total, candidate) => total + candidate.behaviorScore,
      0,
    );

    return {
      assignments: bestAssignments,
      totalRsr,
      averageRsr: totalRsr / MatchmakingConfig.playersPerTeam,
      averageBehaviorScore: totalBehavior / MatchmakingConfig.playersPerTeam,
      rolePenalty: bestPenalty,
    };
  }

  private validateCandidates(
    candidates: readonly MatchmakingCandidate[],
  ): void {
    if (candidates.length !== MatchmakingConfig.playersPerTeam) {
      throw new InvalidMatchmakingPoolError(
        `Exactly ${MatchmakingConfig.playersPerTeam} players are required to allocate team roles.`,
      );
    }

    const playerIds = new Set<string>();

    for (const candidate of candidates) {
      if (!candidate.id.trim() || playerIds.has(candidate.id)) {
        throw new InvalidMatchmakingPoolError(
          "Role allocation requires five unique players.",
        );
      }

      playerIds.add(candidate.id);

      for (const role of [
        candidate.roles.primary,
        candidate.roles.secondary,
        candidate.roles.avoided,
      ]) {
        if (role !== null && !isPlayerRole(role)) {
          throw new InvalidMatchmakingPoolError(
            `Invalid role preference for player ${candidate.id}.`,
          );
        }
      }
    }
  }

  private createAssignment(
    candidate: MatchmakingCandidate,
    assignedRole: PlayerRole,
  ): MatchmakingAssignment {
    const roleFit = this.getRoleFit(candidate, assignedRole);

    return {
      candidate,
      assignedRole,
      roleFit,
      rolePenalty: MatchmakingConfig.rolePenalties[roleFit],
    };
  }

  private getRoleFit(
    candidate: MatchmakingCandidate,
    assignedRole: PlayerRole,
  ): RoleFit {
    if (candidate.roles.primary === assignedRole) {
      return "primary";
    }

    if (candidate.roles.secondary === assignedRole) {
      return "secondary";
    }

    if (candidate.roles.avoided === assignedRole) {
      return "avoided";
    }

    return "flexible";
  }
}
