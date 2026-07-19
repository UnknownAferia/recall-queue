import type { PlayerRole } from "../constants/playerRoles.js";

export interface PlayerDiscordProfile {
  id: string;
  username: string;
}

export interface PlayerGameProfile {
  ign: string;
  playerId: string;
  serverId: string;
}

export interface PlayerRating {
  rsr: number;
  confidence: number;
}

export interface PlayerStatistics {
  wins: number;
  losses: number;
  matchesPlayed: number;
}

export interface PlayerBehavior {
  score: number;
  penalties: number;
}

export interface PlayerQueueData {
  acceptedMatches: number;
  declinedMatches: number;
  bannedUntil: Date | null;
}

export interface PlayerRolePreferences {
  primary: PlayerRole | null;
  secondary: PlayerRole | null;
  avoided: PlayerRole | null;
}

export interface Player {
  discord: PlayerDiscordProfile;
  game: PlayerGameProfile;
  rating: PlayerRating;
  statistics: PlayerStatistics;
  behavior: PlayerBehavior;
  queue: PlayerQueueData;

  /*
   * Optional for compatibility with player documents created before
   * role preferences were introduced.
   */
  preferences?: {
    roles: PlayerRolePreferences;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlayerInput {
  discordId: string;
  discordUsername: string;
  ign: string;
  playerId: string;
  serverId: string;
}