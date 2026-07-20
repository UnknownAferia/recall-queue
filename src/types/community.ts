import type {
  CommunityPanelKind,
  ServiceHeartbeatName,
} from "../constants/community.js";

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
  status: TicketStatus;
  closedByDiscordId: string | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
