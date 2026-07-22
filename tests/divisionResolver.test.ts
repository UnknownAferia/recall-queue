import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DivisionResolver } from "../src/domain/rating/DivisionResolver.js";

describe("DivisionResolver", () => {
  const resolver = new DivisionResolver();

  it("keeps players in placement for their first ten verified matches", () => {
    assert.deepEqual(resolver.resolve(1_250, 9), {
      state: "placement",
      matchesCompleted: 9,
      matchesRequired: 10,
    });
  });

  it("resolves exact division boundaries after placement", () => {
    const standing = resolver.resolve(1_500, 10);
    assert.equal(standing.state, "ranked");

    if (standing.state === "ranked") {
      assert.equal(standing.division.name, "Diamond");
      assert.equal(standing.nextDivision?.name, "Master");
      assert.equal(standing.progressRsr, 0);
      assert.equal(standing.requiredRsr, 250);
    }
  });

  it("calculates progress toward the next division", () => {
    const standing = resolver.resolve(1_625, 25);
    assert.equal(standing.state, "ranked");

    if (standing.state === "ranked") {
      assert.equal(standing.division.name, "Diamond");
      assert.equal(standing.progressRsr, 125);
      assert.equal(standing.progressPercentage, 50);
    }
  });

  it("caps top-ranked players in Apex", () => {
    const standing = resolver.resolve(2_750, 100);
    assert.equal(standing.state, "ranked");

    if (standing.state === "ranked") {
      assert.equal(standing.division.name, "Apex");
      assert.equal(standing.nextDivision, null);
      assert.equal(standing.progressPercentage, 100);
    }
  });

  it("rejects invalid ranked-standing input", () => {
    assert.throws(() => resolver.resolve(Number.NaN, 10));
    assert.throws(() => resolver.resolve(1_000, -1));
    assert.throws(() => resolver.resolve(1_000, 1.5));
  });
});
