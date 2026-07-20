import type {
  BalancedTeam,
  MatchmakingCandidate,
} from "./MatchmakingCandidate.js";
import { MatchmakingConfig } from "./MatchmakingConfig.js";
import { RoleAllocator } from "./RoleAllocator.js";

export interface QueuedMatchmakingCandidate {
  readonly candidate: MatchmakingCandidate;
  readonly joinedAt: Date;
}

export interface SquadFormation {
  readonly captainDiscordId: string;
  readonly team: BalancedTeam;
  readonly rsrSpread: number;
  readonly behaviorSpread: number;
  readonly totalCost: number;
  readonly compatibilityScore: number;
}

const TeamFormationConfig = Object.freeze({
  candidateWindowSize: 15,
  ratingSpreadWeight: 1,
  behaviorSpreadWeight: 2,
  qualityCostScale: 10,
});

interface FormationSolution {
  readonly formation: SquadFormation;
  readonly tieBreaker: string;
}

export class TeamFormationEngine {
  public constructor(private readonly roleAllocator = new RoleAllocator()) {}

  public form(
    queuedCandidates: readonly QueuedMatchmakingCandidate[],
  ): SquadFormation | null {
    if (queuedCandidates.length < MatchmakingConfig.playersPerTeam) {
      return null;
    }

    const orderedCandidates = [...queuedCandidates].sort(
      (left, right) =>
        left.joinedAt.getTime() - right.joinedAt.getTime() ||
        left.candidate.id.localeCompare(right.candidate.id),
    );

    const oldestCandidate = orderedCandidates[0]!;
    const candidateWindow = [
      oldestCandidate,
      ...orderedCandidates
        .slice(1)
        .sort(
          (left, right) =>
            this.calculateAnchorDistance(
              oldestCandidate.candidate,
              left.candidate,
            ) -
              this.calculateAnchorDistance(
                oldestCandidate.candidate,
                right.candidate,
              ) ||
            left.joinedAt.getTime() - right.joinedAt.getTime() ||
            left.candidate.id.localeCompare(right.candidate.id),
        )
        .slice(0, TeamFormationConfig.candidateWindowSize - 1),
    ];

    let bestSolution: FormationSolution | null = null;

    for (const teammateIndexes of this.createTeammateCombinations(
      candidateWindow.length - 1,
    )) {
      const selectedCandidates = [
        oldestCandidate,
        ...teammateIndexes.map((index) => candidateWindow[index + 1]!),
      ];

      const solution = this.evaluateFormation(selectedCandidates);

      if (
        !bestSolution ||
        solution.formation.totalCost < bestSolution.formation.totalCost ||
        (solution.formation.totalCost === bestSolution.formation.totalCost &&
          solution.tieBreaker < bestSolution.tieBreaker)
      ) {
        bestSolution = solution;
      }
    }

    return bestSolution?.formation ?? null;
  }

  private calculateAnchorDistance(
    anchor: MatchmakingCandidate,
    candidate: MatchmakingCandidate,
  ): number {
    return (
      Math.abs(anchor.rsr - candidate.rsr) +
      Math.abs(anchor.behaviorScore - candidate.behaviorScore) *
        TeamFormationConfig.behaviorSpreadWeight
    );
  }

  private createTeammateCombinations(availableCandidates: number): number[][] {
    const combinations: number[][] = [];
    const teammatesNeeded = MatchmakingConfig.playersPerTeam - 1;

    const visit = (nextIndex: number, selected: number[]): void => {
      if (selected.length === teammatesNeeded) {
        combinations.push([...selected]);
        return;
      }

      const remainingSlots = teammatesNeeded - selected.length;

      for (
        let index = nextIndex;
        index <= availableCandidates - remainingSlots;
        index += 1
      ) {
        selected.push(index);
        visit(index + 1, selected);
        selected.pop();
      }
    };

    visit(0, []);

    return combinations;
  }

  private evaluateFormation(
    queuedCandidates: readonly QueuedMatchmakingCandidate[],
  ): FormationSolution {
    const team = this.roleAllocator.allocate(
      queuedCandidates.map((entry) => entry.candidate),
    );

    const ratings = queuedCandidates.map((entry) => entry.candidate.rsr);

    const behaviorScores = queuedCandidates.map(
      (entry) => entry.candidate.behaviorScore,
    );

    const rsrSpread = Math.max(...ratings) - Math.min(...ratings);
    const behaviorSpread =
      Math.max(...behaviorScores) - Math.min(...behaviorScores);

    const totalCost =
      rsrSpread * TeamFormationConfig.ratingSpreadWeight +
      behaviorSpread * TeamFormationConfig.behaviorSpreadWeight +
      team.rolePenalty;

    return {
      formation: {
        captainDiscordId: queuedCandidates
          .slice()
          .sort(
            (left, right) =>
              left.joinedAt.getTime() - right.joinedAt.getTime() ||
              left.candidate.id.localeCompare(right.candidate.id),
          )[0]!.candidate.id,
        team,
        rsrSpread,
        behaviorSpread,
        totalCost,
        compatibilityScore: Math.max(
          0,
          Math.min(100, 100 - totalCost / TeamFormationConfig.qualityCostScale),
        ),
      },
      tieBreaker: team.assignments
        .map(
          (assignment) =>
            `${assignment.candidate.id}:${assignment.assignedRole}`,
        )
        .join("|"),
    };
  }
}
