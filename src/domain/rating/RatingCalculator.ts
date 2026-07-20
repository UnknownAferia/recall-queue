import type { SquadResult } from "../../constants/squad.js";
import { RatingConfig } from "./RatingConfig.js";

export interface RatingCalculationInput {
  readonly rsr: number;
  readonly confidence: number;
  readonly matchesPlayed: number;
  readonly squadAverageRsr: number;
  readonly outcome: SquadResult;
}

export interface RatingCalculation {
  readonly rsrBefore: number;
  readonly rsrAfter: number;
  readonly delta: number;
  readonly confidenceBefore: number;
  readonly confidenceAfter: number;
  readonly expectedWinProbability: number;
  readonly kFactor: number;
  readonly placementMatch: boolean;
}

export class RatingCalculator {
  public calculate(input: RatingCalculationInput): RatingCalculation {
    this.validateInput(input);

    const confidenceBefore = this.clamp(
      input.confidence,
      0,
      RatingConfig.maximumConfidence,
    );
    const expectedWinProbability = this.round(
      1 /
        (1 +
          10 **
            ((RatingConfig.baselineRsr - input.squadAverageRsr) /
              RatingConfig.probabilityScale)),
      4,
    );
    const kFactor = this.round(
      RatingConfig.maximumKFactor -
        (RatingConfig.maximumKFactor - RatingConfig.minimumKFactor) *
          (confidenceBefore / RatingConfig.maximumConfidence),
      2,
    );
    const actualScore = input.outcome === "win" ? 1 : 0;
    let requestedDelta = Math.round(
      kFactor * (actualScore - expectedWinProbability),
    );

    if (requestedDelta === 0) {
      requestedDelta = input.outcome === "win" ? 1 : -1;
    }

    const rsrAfter = Math.max(
      RatingConfig.minimumRsr,
      input.rsr + requestedDelta,
    );
    const placementMatch = input.matchesPlayed < RatingConfig.placementMatches;
    const completedPlacementMatches = Math.min(
      input.matchesPlayed + 1,
      RatingConfig.placementMatches,
    );
    const placementConfidence = Math.round(
      RatingConfig.initialConfidence +
        ((RatingConfig.maximumConfidence - RatingConfig.initialConfidence) *
          completedPlacementMatches) /
          RatingConfig.placementMatches,
    );
    const confidenceAfter = placementMatch
      ? Math.max(confidenceBefore, placementConfidence)
      : confidenceBefore;

    return {
      rsrBefore: input.rsr,
      rsrAfter,
      delta: rsrAfter - input.rsr,
      confidenceBefore,
      confidenceAfter,
      expectedWinProbability,
      kFactor,
      placementMatch,
    };
  }

  private validateInput(input: RatingCalculationInput): void {
    const numericValues = [
      input.rsr,
      input.confidence,
      input.matchesPlayed,
      input.squadAverageRsr,
    ];

    if (
      numericValues.some((value) => !Number.isFinite(value)) ||
      input.rsr < RatingConfig.minimumRsr ||
      input.matchesPlayed < 0 ||
      !Number.isInteger(input.matchesPlayed) ||
      input.squadAverageRsr < RatingConfig.minimumRsr
    ) {
      throw new Error("Invalid rating calculation input.");
    }
  }

  private clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
  }

  private round(value: number, decimals: number): number {
    const multiplier = 10 ** decimals;
    return Math.round(value * multiplier) / multiplier;
  }
}
