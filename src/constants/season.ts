import { RatingConfig } from "../domain/rating/RatingConfig.js";

export const SeasonStatuses = ["scheduled", "active", "completed"] as const;

export type SeasonStatus = (typeof SeasonStatuses)[number];

export const SeasonConfig = Object.freeze({
  baselineRsr: RatingConfig.baselineRsr,
  placementMatches: RatingConfig.placementMatches,
  softResetRetention: 0.5,
});
