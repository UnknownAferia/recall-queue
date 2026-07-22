import type { PlayerRole } from "../constants/playerRoles.js";
import type { PlayerVerificationStatus } from "../constants/playerVerification.js";

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
  readonly integrityLevel: number;
  readonly lastIntegritySanctionAt: Date | null;
}

export interface PlayerQueueDto {
  readonly acceptedMatches: number;
  readonly declinedMatches: number;
  readonly bannedUntil: Date | null;
  readonly disciplineLevel: number;
  readonly lastPenaltyAt: Date | null;
}

export interface PlayerRolePreferencesDto {
  readonly primary: PlayerRole | null;
  readonly secondary: PlayerRole | null;
  readonly avoided: PlayerRole | null;
}

export interface PlayerPreferencesDto {
  readonly roles: PlayerRolePreferencesDto;
}

export interface PlayerVerificationDto {
  readonly status: PlayerVerificationStatus;
  readonly submittedAt: Date | null;
  readonly reviewedAt: Date | null;
  readonly reviewedByDiscordId: string | null;
  readonly rejectionReason: string | null;
}

export interface PlayerDto {
  readonly id: string;
  readonly discord: PlayerDiscordDto;
  readonly game: PlayerGameDto;
  readonly rating: PlayerRatingDto;
  readonly statistics: PlayerStatisticsDto;
  readonly behavior: PlayerBehaviorDto;
  readonly queue: PlayerQueueDto;
  readonly verification: PlayerVerificationDto;
  readonly preferences: PlayerPreferencesDto;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
