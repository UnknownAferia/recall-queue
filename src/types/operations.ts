export type MaintenanceScope = "all" | "registration" | "matchmaking";

export interface OperationalState {
  key: "global";
  registrationOpen: boolean;
  matchmakingOpen: boolean;
  reason: string | null;
  changedByDiscordId: string | null;
  changedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemStatusSnapshot {
  state: OperationalState;
  databaseLatencyMs: number;
  coreHeartbeatAt: Date | null;
  communityHeartbeatAt: Date | null;
  queuedPlayers: number;
  readyChecks: number;
  activeSquads: number;
  pendingResults: number;
  disputedResults: number;
  pendingVerifications: number;
  staleVerifications: number;
  capturedAt: Date;
}

export interface RecoverySummary {
  expiredReadyChecks: number;
  expiredResultCases: number;
  penalizedPlayers: number;
  staleQueueEntries: number;
  restoredVoiceChannels: number;
  removedVoiceChannels: number;
  warnings: readonly string[];
}

export type LaunchAuditLevel = "pass" | "warning" | "failure";

export interface LaunchAuditCheck {
  name: string;
  level: LaunchAuditLevel;
  detail: string;
}

export interface LaunchAuditResult {
  checks: readonly LaunchAuditCheck[];
  capturedAt: Date;
}
