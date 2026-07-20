import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PlayerRole } from "../src/constants/playerRoles.js";
import type { MatchmakingCandidate } from "../src/domain/matchmaking/MatchmakingCandidate.js";
import {
  TeamFormationEngine,
  type QueuedMatchmakingCandidate,
} from "../src/domain/matchmaking/TeamFormationEngine.js";

const roles: readonly PlayerRole[] = ["exp", "gold", "mid", "jungle", "roam"];

function createQueuedCandidate(
  id: string,
  role: PlayerRole,
  rsr: number,
  joinedAtOffset: number,
): QueuedMatchmakingCandidate {
  const candidate: MatchmakingCandidate = {
    id,
    displayName: id,
    rsr,
    behaviorScore: 100,
    roles: {
      primary: role,
      secondary: roles[(roles.indexOf(role) + 1) % roles.length]!,
      avoided: null,
    },
  };

  return {
    candidate,
    joinedAt: new Date(
      new Date("2026-07-19T12:00:00.000Z").getTime() + joinedAtOffset,
    ),
  };
}

function createPool(): QueuedMatchmakingCandidate[] {
  const closeCandidates = roles.map((role, index) =>
    createQueuedCandidate(
      `close-${index}`,
      role,
      1_000 + index * 10,
      index * 1_000,
    ),
  );

  const distantCandidates = roles.map((role, index) =>
    createQueuedCandidate(
      `distant-${index}`,
      role,
      1_500 + index * 10,
      (index + roles.length) * 1_000,
    ),
  );

  return [...closeCandidates, ...distantCandidates];
}

describe("TeamFormationEngine", () => {
  it("waits until at least five players are available", () => {
    const formation = new TeamFormationEngine().form(createPool().slice(0, 4));

    assert.equal(formation, null);
  });

  it("forms one compatible five-player squad around the oldest player", () => {
    const formation = new TeamFormationEngine().form(createPool());

    assert.ok(formation);
    assert.equal(formation.team.assignments.length, 5);
    assert.equal(formation.team.rolePenalty, 0);
    assert.equal(formation.captainDiscordId, "close-0");

    const selectedIds = formation.team.assignments.map(
      (assignment) => assignment.candidate.id,
    );

    assert.ok(selectedIds.includes("close-0"));
    assert.ok(selectedIds.every((id) => id.startsWith("close-")));
    assert.deepEqual(
      formation.team.assignments
        .map((assignment) => assignment.assignedRole)
        .sort(),
      [...roles].sort(),
    );
  });

  it("is deterministic regardless of pool order", () => {
    const engine = new TeamFormationEngine();
    const pool = createPool();

    const first = engine.form(pool);
    const second = engine.form([...pool].reverse());

    assert.ok(first);
    assert.ok(second);

    const summarize = (formation: NonNullable<typeof first>) =>
      formation.team.assignments.map(
        ({ candidate, assignedRole }) => `${candidate.id}:${assignedRole}`,
      );

    assert.deepEqual(summarize(first), summarize(second));
  });
});
