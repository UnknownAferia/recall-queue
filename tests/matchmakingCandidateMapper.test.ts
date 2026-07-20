import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PlayerDto } from "../src/dto/PlayerDto.js";
import { MatchmakingCandidateMapper } from "../src/mappers/MatchmakingCandidateMapper.js";

function createPlayer(): PlayerDto {
  const now = new Date("2026-07-19T12:00:00.000Z");

  return {
    id: "player-document-id",
    discord: {
      id: "discord-player-id",
      username: "player",
    },
    game: {
      ign: "Vora Player",
      playerId: "12345678",
      serverId: "1234",
    },
    rating: {
      rsr: 1_250,
      confidence: 75,
    },
    statistics: {
      wins: 10,
      losses: 8,
      matchesPlayed: 18,
    },
    behavior: {
      score: 96,
      penalties: 0,
    },
    queue: {
      acceptedMatches: 18,
      declinedMatches: 0,
      bannedUntil: null,
      disciplineLevel: 0,
      lastPenaltyAt: null,
    },
    preferences: {
      roles: {
        primary: "jungle",
        secondary: "mid",
        avoided: "roam",
      },
    },
    createdAt: now,
    updatedAt: now,
  };
}

describe("MatchmakingCandidateMapper", () => {
  it("maps the matchmaking-relevant player snapshot", () => {
    const candidate = MatchmakingCandidateMapper.fromPlayer(createPlayer());

    assert.deepEqual(candidate, {
      id: "discord-player-id",
      displayName: "Vora Player",
      rsr: 1_250,
      behaviorScore: 96,
      roles: {
        primary: "jungle",
        secondary: "mid",
        avoided: "roam",
      },
    });
  });

  it("normalizes corrupted role values before balancing", () => {
    const player = createPlayer();
    const roles = player.preferences.roles as {
      primary: unknown;
      secondary: unknown;
      avoided: unknown;
    };

    roles.primary = "";
    roles.secondary = "invalid-role";
    roles.avoided = undefined;

    const candidate = MatchmakingCandidateMapper.fromPlayer(player);

    assert.deepEqual(candidate.roles, {
      primary: null,
      secondary: null,
      avoided: null,
    });
  });
});
