import { RatingConfig } from "../domain/rating/RatingConfig.js";

export const SeasonStatuses = ["scheduled", "active", "completed"] as const;

export type SeasonStatus = (typeof SeasonStatuses)[number];

export const SeasonAchievements = ["champion", "topTen", "veteran"] as const;

export type SeasonAchievement = (typeof SeasonAchievements)[number];

export const SeasonConfig = Object.freeze({
  baselineRsr: RatingConfig.baselineRsr,
  placementMatches: RatingConfig.placementMatches,
  softResetRetention: 0.5,
  leaderboardLimit: 10,
  historyLimit: 10,
  veteranMatchesRequired: 25,
});
