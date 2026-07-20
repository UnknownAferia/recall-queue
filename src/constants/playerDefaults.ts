import { RatingConfig } from "../domain/rating/RatingConfig.js";

export const PlayerDefaults = Object.freeze({
  initialRating: RatingConfig.baselineRsr,
  initialConfidence: RatingConfig.initialConfidence,
  initialBehaviorScore: 100,
});
