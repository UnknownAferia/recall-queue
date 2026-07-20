import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PlayerRole } from "../src/constants/playerRoles.js";
import type { MatchmakingCandidate } from "../src/domain/matchmaking/MatchmakingCandidate.js";
import { InvalidMatchmakingPoolError } from "../src/domain/matchmaking/InvalidMatchmakingPoolError.js";
import { TeamBalancer } from "../src/domain/matchmaking/TeamBalancer.js";

const roles: readonly PlayerRole[] = [
  "exp",
  "gold",
  "mid",
  "jungle",
  "roam",
];

function createCandidate(
  index: number,
  primary: PlayerRole,
  rsr = 1_000,
): MatchmakingCandidate {
  return {
    id: `player-${index}`,
    displayName: `Player ${index}`,
    rsr,
    behaviorScore: 100,
    roles: {
      primary,
      secondary: roles[(roles.indexOf(primary) + 1) % roles.length]!,
      avoided: null,
    },
  };
}

function createBalancedPool(): MatchmakingCandidate[] {
  return roles.flatMap((role, roleIndex) => [
    createCandidate(roleIndex * 2, role, 900 + roleIndex * 50),
    createCandidate(roleIndex * 2 + 1, role, 900 + roleIndex * 50),
  ]);
}

describe("TeamBalancer", () => {
  it("creates two five-player teams with every role assigned once", () => {
    const match = new TeamBalancer().balance(
      createBalancedPool(),
    );

    assert.equal(match.teamA.assignments.length, 5);
    assert.equal(match.teamB.assignments.length, 5);
    assert.equal(match.ratingDifference, 0);
    assert.equal(match.totalRolePenalty, 0);

    for (const team of [match.teamA, match.teamB]) {
      assert.deepEqual(
        [...team.assignments]
          .map((assignment) => assignment.assignedRole)
          .sort(),
        [...roles].sort(),
      );
    }
  });

  it("returns the same result regardless of input order", () => {
    const balancer = new TeamBalancer();
    const candidates = createBalancedPool();

    const firstMatch = balancer.balance(candidates);
    const secondMatch = balancer.balance(
      [...candidates].reverse(),
    );

    const summarize = (match: typeof firstMatch) => ({
      teamA: match.teamA.assignments.map(
        ({ candidate, assignedRole }) =>
          `${candidate.id}:${assignedRole}`,
      ),
      teamB: match.teamB.assignments.map(
        ({ candidate, assignedRole }) =>
          `${candidate.id}:${assignedRole}`,
      ),
    });

    assert.deepEqual(
      summarize(firstMatch),
      summarize(secondMatch),
    );
  });

  it("avoids an avoided role when a clean assignment exists", () => {
    const candidates = createBalancedPool().map(
      (candidate, index) => ({
        ...candidate,
        roles: {
          ...candidate.roles,
          avoided: roles[(index + 3) % roles.length]!,
        },
      }),
    );

    const match = new TeamBalancer().balance(candidates);

    for (const assignment of [
      ...match.teamA.assignments,
      ...match.teamB.assignments,
    ]) {
      assert.notEqual(assignment.roleFit, "avoided");
    }
  });

  it("rejects incomplete and duplicate player pools", () => {
    const balancer = new TeamBalancer();
    const candidates = createBalancedPool();

    assert.throws(
      () => balancer.balance(candidates.slice(0, 9)),
      InvalidMatchmakingPoolError,
    );

    assert.throws(
      () =>
        balancer.balance([
          ...candidates.slice(0, 9),
          candidates[0]!,
        ]),
      InvalidMatchmakingPoolError,
    );
  });
});
