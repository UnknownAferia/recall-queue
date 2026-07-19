import type { PlayerRole } from "../constants/playerRoles.js";

export interface PlayerDiscordDto {
  readonly id: string;
  readonly username: string;
}

export interface PlayerGameDto {
  readonly ign: string;
  readonly playerId: string;
  readonly serverId: string;
}

export interface PlayerRatingDto {
  readonly rsr: number;
  readonly confidence: number;
}

export interface PlayerStatisticsDto {
  readonly wins: number;
  readonly losses: number;
  readonly matchesPlayed: number;
}

export interface PlayerBehaviorDto {
  readonly score: number;
  readonly penalties: number;
}

export interface PlayerQueueDto {
  readonly acceptedMatches: number;
  readonly declinedMatches: number;
  readonly bannedUntil: Date | null;
}

export interface PlayerRolePreferencesDto {
  readonly primary: PlayerRole | null;
  readonly secondary: PlayerRole | null;
  readonly avoided: PlayerRole | null;
}

export interface PlayerPreferencesDto {
  readonly roles: PlayerRolePreferencesDto;
}

export interface PlayerDto {
  readonly id: string;
  readonly discord: PlayerDiscordDto;
  readonly game: PlayerGameDto;
  readonly rating: PlayerRatingDto;
  readonly statistics: PlayerStatisticsDto;
  readonly behavior: PlayerBehaviorDto;
  readonly queue: PlayerQueueDto;
  readonly preferences: PlayerPreferencesDto;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}