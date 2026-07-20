import { PlayerDefaults } from "../constants/playerDefaults.js";
import { PlayerModel } from "../models/PlayerModel.js";

export async function synchronizeRatingConfiguration(): Promise<void> {
  await PlayerModel.updateMany(
    {
      "rating.rsr": PlayerDefaults.initialRating,
      "rating.confidence": 100,
      "statistics.matchesPlayed": 0,
    },
    {
      $set: {
        "rating.confidence": PlayerDefaults.initialConfidence,
      },
    },
    {
      runValidators: true,
    },
  ).exec();
}
