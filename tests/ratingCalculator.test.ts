import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RatingCalculator } from "../src/domain/rating/RatingCalculator.js";

describe("RatingCalculator", () => {
  const calculator = new RatingCalculator();

  it("moves a new baseline player through placements", () => {
    const result = calculator.calculate({
      rsr: 1_000,
      confidence: 20,
      matchesPlayed: 0,
      squadAverageRsr: 1_000,
      outcome: "win",
    });

    assert.deepEqual(result, {
      rsrBefore: 1_000,
      rsrAfter: 1_032,
      delta: 32,
      confidenceBefore: 20,
      confidenceAfter: 28,
      expectedWinProbability: 0.5,
      kFactor: 64,
      placementMatch: true,
    });
  });

  it("keeps established ratings less volatile", () => {
    const result = calculator.calculate({
      rsr: 1_000,
      confidence: 100,
      matchesPlayed: 25,
      squadAverageRsr: 1_000,
      outcome: "loss",
    });

    assert.equal(result.delta, -16);
    assert.equal(result.rsrAfter, 984);
    assert.equal(result.confidenceAfter, 100);
    assert.equal(result.kFactor, 32);
    assert.equal(result.placementMatch, false);
  });

  it("rewards expected wins less than even matches", () => {
    const evenWin = calculator.calculate({
      rsr: 1_000,
      confidence: 20,
      matchesPlayed: 0,
      squadAverageRsr: 1_000,
      outcome: "win",
    });
    const expectedWin = calculator.calculate({
      rsr: 1_400,
      confidence: 20,
      matchesPlayed: 0,
      squadAverageRsr: 1_400,
      outcome: "win",
    });

    assert.ok(expectedWin.expectedWinProbability > 0.9);
    assert.ok(expectedWin.delta < evenWin.delta);
    assert.ok(expectedWin.delta > 0);
  });

  it("never lowers RSR below zero", () => {
    const result = calculator.calculate({
      rsr: 5,
      confidence: 100,
      matchesPlayed: 20,
      squadAverageRsr: 1_000,
      outcome: "loss",
    });

    assert.equal(result.rsrAfter, 0);
    assert.equal(result.delta, -5);
  });

  it("rejects invalid input", () => {
    assert.throws(
      () =>
        calculator.calculate({
          rsr: Number.NaN,
          confidence: 20,
          matchesPlayed: 0,
          squadAverageRsr: 1_000,
          outcome: "win",
        }),
      /Invalid rating calculation input/,
    );
  });
});
