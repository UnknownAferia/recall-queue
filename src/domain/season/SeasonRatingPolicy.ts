import type { SeasonRules } from "../../types/season.js";

export function calculateSeasonInitialRsr(
  lifetimeRsr: number,
  rules: SeasonRules,
): number {
  return Math.max(
    0,
    Math.round(
      rules.baselineRsr +
        (lifetimeRsr - rules.baselineRsr) * rules.softResetRetention,
    ),
  );
}
