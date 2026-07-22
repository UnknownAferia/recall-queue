import type { PlayerRole } from "../constants/playerRoles.js";
import type { PlayerVerificationStatus } from "../constants/playerVerification.js";

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
  integrityLevel: number;
  lastIntegritySanctionAt: Date | null;
}

export interface PlayerQueueData {
  acceptedMatches: number;
  declinedMatches: number;
  bannedUntil: Date | null;
  disciplineLevel: number;
  lastPenaltyAt: Date | null;
}

export interface PlayerRolePreferences {
  primary: PlayerRole | null;
  secondary: PlayerRole | null;
  avoided: PlayerRole | null;
}

export interface PlayerVerification {
  status: PlayerVerificationStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedByDiscordId: string | null;
  rejectionReason: string | null;
}

export interface Player {
  discord: PlayerDiscordProfile;
  game: PlayerGameProfile;
  rating: PlayerRating;
  statistics: PlayerStatistics;
  behavior: PlayerBehavior;
  queue: PlayerQueueData;

  /* Missing on profiles created before account verification was introduced. */
  verification?: PlayerVerification;

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

export type RolePreferenceSlot = "primary" | "secondary" | "avoided";
