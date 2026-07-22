import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveSeasonAchievements } from "../src/domain/season/SeasonAchievementPolicy.js";
import { calculateSeasonInitialRsr } from "../src/domain/season/SeasonRatingPolicy.js";

describe("Season progression policies", () => {
  it("applies configurable soft-reset retention around the season baseline", () => {
    const baseRules = {
      baselineRsr: 1_000,
      placementMatches: 10,
      softResetRetention: 0,
    };

    assert.equal(calculateSeasonInitialRsr(1_600, baseRules), 1_000);
    assert.equal(
      calculateSeasonInitialRsr(1_600, {
        ...baseRules,
        softResetRetention: 0.5,
      }),
      1_300,
    );
    assert.equal(
      calculateSeasonInitialRsr(1_600, {
        ...baseRules,
        softResetRetention: 1,
      }),
      1_600,
    );
    assert.equal(
      calculateSeasonInitialRsr(200, {
        ...baseRules,
        softResetRetention: 0.5,
      }),
      600,
    );
  });

  it("awards final standing and participation achievements independently", () => {
    assert.deepEqual(
      resolveSeasonAchievements({ finalRank: 1, matchesPlayed: 25 }),
      ["champion", "veteran"],
    );
    assert.deepEqual(
      resolveSeasonAchievements({ finalRank: 7, matchesPlayed: 10 }),
      ["topTen"],
    );
    assert.deepEqual(
      resolveSeasonAchievements({ finalRank: null, matchesPlayed: 25 }),
      ["veteran"],
    );
    assert.deepEqual(
      resolveSeasonAchievements({ finalRank: 18, matchesPlayed: 12 }),
      [],
    );
  });
});
