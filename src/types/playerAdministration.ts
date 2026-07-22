import type {
  PlayerAdministrationAction,
  PlayerAdministrationOperationStatus,
} from "../constants/playerAdministration.js";
import type { PlayerDto } from "../dto/PlayerDto.js";
import type { PlayerVerificationEvidence } from "./playerVerification.js";

export interface PlayerAdministrationHistorySummary {
  readonly queueGuildIds: readonly string[];
  readonly activeSquadId: string | null;
  readonly activeSquadGuildId: string | null;
  readonly competitiveSquads: number;
  readonly seasonMemberships: number;
  readonly moderationRecords: number;
  readonly pendingVerifications: number;
}

export interface PlayerAdministrationInspection {
  readonly player: PlayerDto;
  readonly history: PlayerAdministrationHistorySummary;
  readonly unregisterBlockers: readonly string[];
  readonly canUnregister: boolean;
}

export interface PlayerAdministrationOperation {
  readonly id: string;
  readonly schemaVersion: number;
  readonly action: PlayerAdministrationAction;
  readonly status: PlayerAdministrationOperationStatus;
  readonly guildId: string;
  readonly actorDiscordId: string;
  readonly targetDiscordId: string;
  readonly reason: string;
  readonly expiresAt: Date;
  readonly completedAt: Date | null;
  readonly blockerReasons: readonly string[];
  readonly snapshot: {
    readonly playerId: string;
    readonly ign: string;
    readonly gamePlayerId: string;
    readonly gameServerId: string;
    readonly verificationStatus: string;
    readonly matchesPlayed: number;
    readonly rsr: number;
  } | null;
  readonly result: {
    readonly queuesRemoved: number;
    readonly verificationRequestsClosed: number;
    readonly playerDeleted: boolean;
    readonly managedRolesRemoved: number;
    readonly evidenceMessagesRemoved: number;
  } | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PlayerAdministrationExecutionResult {
  readonly operation: PlayerAdministrationOperation;
  readonly evidence: readonly PlayerVerificationEvidence[];
}
