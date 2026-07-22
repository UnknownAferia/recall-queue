import type {
  CommunityPanelKind,
  ServiceHeartbeatName,
} from "../constants/community.js";
import type { OperationalAuditEventType } from "../constants/operationalAudit.js";

export interface CommunityPanelRecord {
  guildId: string;
  kind: CommunityPanelKind;
  channelId: string;
  messageId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceHeartbeat {
  service: ServiceHeartbeatName;
  heartbeatAt: Date;
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TicketStatus = "open" | "closed";

export interface SupportTicket {
  guildId: string;
  channelId: string;
  requesterDiscordId: string;
  subject: string;
  description: string;
  relatedModerationCaseNumber: number | null;
  status: TicketStatus;
  closedByDiscordId: string | null;
  closedAt: Date | null;
  transcriptChannelId: string | null;
  transcriptMessageId: string | null;
  transcriptMessageCount: number;
  transcriptArchivedAt: Date | null;
  channelDeleteAfter: Date | null;
  channelDeletedAt: Date | null;
  transcriptDeleteAfter: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type OperationalAuditDetails = Readonly<
  Record<string, string | number | boolean | null>
>;

export interface OperationalAuditEvent {
  schemaVersion: number;
  eventType: OperationalAuditEventType;
  guildId: string;
  actorDiscordId: string | null;
  subjectType: "support_ticket" | "community_service";
  subjectId: string;
  details: OperationalAuditDetails;
  occurredAt: Date;
  createdAt: Date;
}

export interface MatchmakingStatusSnapshot {
  guildId: string;
  coreOnline: boolean;
  coreHeartbeatAt: Date | null;
  queueStatus: "open" | "locked";
  queuedPlayers: number;
  readyChecks: number;
  activeSquads: number;
  pendingResults: number;
  disputedResults: number;
  capturedAt: Date;
}
