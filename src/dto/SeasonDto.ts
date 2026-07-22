import type { SeasonAchievement, SeasonStatus } from "../constants/season.js";

export interface SeasonRulesDto {
  readonly baselineRsr: number;
  readonly placementMatches: number;
  readonly softResetRetention: number;
}

export interface SeasonDto {
  readonly id: string;
  readonly sequence: number;
  readonly name: string;
  readonly slug: string;
  readonly status: SeasonStatus;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly activatedAt: Date | null;
  readonly completedAt: Date | null;
  readonly createdByDiscordId: string;
  readonly activatedByDiscordId: string | null;
  readonly completedByDiscordId: string | null;
  readonly rules: SeasonRulesDto;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SeasonControlStateDto {
  readonly active: SeasonDto | null;
  readonly scheduled: readonly SeasonDto[];
  readonly recentlyCompleted: readonly SeasonDto[];
}

export interface SeasonLeaderboardEntryDto {
  readonly rank: number;
  readonly discordId: string;
  readonly ign: string;
  readonly currentRsr: number;
  readonly peakRsr: number;
  readonly matchesPlayed: number;
  readonly wins: number;
  readonly losses: number;
  readonly achievements: readonly SeasonAchievement[];
}

export interface SeasonLeaderboardDto {
  readonly season: SeasonDto;
  readonly entries: readonly SeasonLeaderboardEntryDto[];
}

export interface SeasonHistoryEntryDto {
  readonly season: SeasonDto;
  readonly initialRsr: number;
  readonly currentRsr: number;
  readonly peakRsr: number;
  readonly finalRsr: number | null;
  readonly finalRank: number | null;
  readonly matchesPlayed: number;
  readonly wins: number;
  readonly losses: number;
  readonly placementComplete: boolean;
  readonly achievements: readonly SeasonAchievement[];
}
