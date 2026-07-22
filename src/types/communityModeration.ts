import type {
  CommunityModerationAction,
  CommunityModerationCaseStatus,
  CommunityModerationSource,
  CommunityReportStatus,
  CommunityReportType,
} from "../constants/communityModeration.js";

export interface CommunityModerationCaseDetails {
  messageCount?: number;
  slowmodeSeconds?: number;
  automodRule?: string;
}

export interface CommunityModerationCase {
  schemaVersion: number;
  guildId: string;
  caseNumber: number;
  source: CommunityModerationSource;
  action: CommunityModerationAction;
  status: CommunityModerationCaseStatus;
  actorDiscordId: string | null;
  targetDiscordId: string | null;
  reason: string;
  durationMs: number | null;
  expiresAt: Date | null;
  pendingUntil: Date | null;
  relatedReportId: string | null;
  channelId: string | null;
  messageId: string | null;
  details: CommunityModerationCaseDetails;
  completedAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  reversedAt: Date | null;
  reversedByDiscordId: string | null;
  reversalReason: string | null;
  purgeAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityReportEvidence {
  channelId: string | null;
  messageId: string | null;
  messageContent: string | null;
  attachmentUrls: string[];
}

export interface CommunityReport {
  schemaVersion: number;
  guildId: string;
  reportNumber: number;
  type: CommunityReportType;
  status: CommunityReportStatus;
  reporterDiscordId: string;
  targetDiscordId: string;
  description: string;
  evidence: CommunityReportEvidence;
  resolutionCaseId: string | null;
  resolvedByDiscordId: string | null;
  resolvedAt: Date | null;
  resolutionNote: string | null;
  purgeAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityModerationCounter {
  guildId: string;
  kind: "case" | "report";
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
}
