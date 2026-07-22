import { RatingConfig } from "./RatingConfig.js";
import {
  RankedDivisions,
  type RankedDivision,
  type RankedStanding,
} from "./RankedDivision.js";

export class DivisionResolver {
  public resolve(rsr: number, matchesPlayed: number): RankedStanding {
    this.validateInput(rsr, matchesPlayed);

    if (matchesPlayed < RatingConfig.placementMatches) {
      return {
        state: "placement",
        matchesCompleted: matchesPlayed,
        matchesRequired: RatingConfig.placementMatches,
      };
    }

    const divisionIndex = this.findDivisionIndex(rsr);
    const division = RankedDivisions[divisionIndex] as RankedDivision;
    const nextDivision = RankedDivisions[divisionIndex + 1] ?? null;
    const progressRsr = rsr - division.minimumRsr;
    const requiredRsr = nextDivision
      ? nextDivision.minimumRsr - division.minimumRsr
      : null;

    return {
      state: "ranked",
      division,
      nextDivision,
      progressRsr,
      requiredRsr,
      progressPercentage: requiredRsr
        ? Math.min(100, Math.floor((progressRsr / requiredRsr) * 100))
        : 100,
    };
  }

  private findDivisionIndex(rsr: number): number {
    for (let index = RankedDivisions.length - 1; index >= 0; index -= 1) {
      if (rsr >= (RankedDivisions[index] as RankedDivision).minimumRsr) {
        return index;
      }
    }

    return 0;
  }

  private validateInput(rsr: number, matchesPlayed: number): void {
    if (
      !Number.isFinite(rsr) ||
      rsr < RatingConfig.minimumRsr ||
      !Number.isSafeInteger(matchesPlayed) ||
      matchesPlayed < 0
    ) {
      throw new Error("Invalid ranked-standing input.");
    }
  }
}
