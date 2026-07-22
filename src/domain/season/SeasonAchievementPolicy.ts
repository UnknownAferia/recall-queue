import {
  SeasonConfig,
  type SeasonAchievement,
} from "../../constants/season.js";

export interface SeasonAchievementInput {
  readonly finalRank: number | null;
  readonly matchesPlayed: number;
}

export function resolveSeasonAchievements(
  input: SeasonAchievementInput,
): SeasonAchievement[] {
  const achievements: SeasonAchievement[] = [];

  if (input.finalRank === 1) {
    achievements.push("champion");
  } else if (input.finalRank !== null && input.finalRank <= 10) {
    achievements.push("topTen");
  }

  if (input.matchesPlayed >= SeasonConfig.veteranMatchesRequired) {
    achievements.push("veteran");
  }

  return achievements;
}
