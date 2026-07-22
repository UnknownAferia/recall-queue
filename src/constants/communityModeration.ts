export const CommunityModerationActions = [
  "warning",
  "timeout",
  "timeout_removed",
  "kick",
  "ban",
  "unban",
  "message_delete",
  "purge",
  "channel_lock",
  "channel_unlock",
  "slowmode",
] as const;

export type CommunityModerationAction =
  (typeof CommunityModerationActions)[number];

export const CommunityModerationSources = [
  "manual",
  "report",
  "automod",
] as const;

export type CommunityModerationSource =
  (typeof CommunityModerationSources)[number];

export const CommunityModerationCaseStatuses = [
  "pending",
  "completed",
  "failed",
  "cancelled",
  "reversed",
] as const;

export type CommunityModerationCaseStatus =
  (typeof CommunityModerationCaseStatuses)[number];

export const CommunityReportTypes = ["message", "user"] as const;
export type CommunityReportType = (typeof CommunityReportTypes)[number];

export const CommunityReportStatuses = [
  "open",
  "resolved",
  "dismissed",
] as const;
export type CommunityReportStatus = (typeof CommunityReportStatuses)[number];

export const CommunityModerationConfig = Object.freeze({
  schemaVersion: 1,
  historyLimit: 10,
  reportInboxLimit: 10,
  pendingActionDurationMs: 5 * 60 * 1_000,
  activeWarningDurationMs: 90 * 24 * 60 * 60 * 1_000,
  recordRetentionMs: 365 * 24 * 60 * 60 * 1_000,
  reportCreateLimit: 5,
  reportCreateWindowMs: 60 * 60 * 1_000,
  purgeMaximumMessages: 100,
  automodWindowMs: 8 * 1_000,
  automodBurstMessages: 6,
  automodRepeatWindowMs: 20 * 1_000,
  automodRepeatedMessages: 3,
  automodMassMentionCount: 5,
  automodEscalationWindowMs: 10 * 60 * 1_000,
  automodTimeoutMs: 10 * 60 * 1_000,
});

export const CommunityTimeoutDurations = Object.freeze({
  "10m": 10 * 60 * 1_000,
  "1h": 60 * 60 * 1_000,
  "24h": 24 * 60 * 60 * 1_000,
  "7d": 7 * 24 * 60 * 60 * 1_000,
});

export type CommunityTimeoutDurationKey =
  keyof typeof CommunityTimeoutDurations;

export function formatCommunityCaseReference(caseNumber: number): string {
  return `VORA-${caseNumber.toString().padStart(6, "0")}`;
}

export function formatCommunityReportReference(reportNumber: number): string {
  return `REPORT-${reportNumber.toString().padStart(6, "0")}`;
}
