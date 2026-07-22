import type { Types } from "mongoose";

import type { SeasonAchievement, SeasonStatus } from "../constants/season.js";

export interface SeasonRules {
  baselineRsr: number;
  placementMatches: number;
  softResetRetention: number;
}

export interface Season {
  sequence: number;
  name: string;
  slug: string;
  status: SeasonStatus;
  startsAt: Date;
  endsAt: Date;
  activatedAt: Date | null;
  completedAt: Date | null;
  createdByDiscordId: string;
  activatedByDiscordId: string | null;
  completedByDiscordId: string | null;
  rules: SeasonRules;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeasonMembership {
  seasonId: Types.ObjectId;
  playerId: Types.ObjectId;
  discordId: string;
  ign: string;
  initialRsr: number;
  currentRsr: number;
  peakRsr: number;
  finalRsr: number | null;
  finalRank: number | null;
  achievements: SeasonAchievement[];
  matchesPlayed: number;
  wins: number;
  losses: number;
  joinedAt: Date;
  lastMatchAt: Date;
}

export interface CreateSeasonInput {
  sequence: number;
  name: string;
  slug: string;
  startsAt: Date;
  endsAt: Date;
  createdByDiscordId: string;
  rules?: Partial<SeasonRules>;
}
