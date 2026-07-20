import type { IntegritySanctionAction } from "../constants/integrity.js";
import type { ModerationAuditEventType } from "../constants/moderationAudit.js";
import type {
  SquadModerationDecision,
  SquadResult,
} from "../constants/squad.js";

export interface ModerationAuditSanctionSnapshot {
  action: IntegritySanctionAction;
  behaviorScoreLoss: number;
  integrityLevelBefore: number;
  integrityLevelAfter: number;
  bannedUntil: Date | null;
}

export interface ModerationAuditEvidenceReference {
  archiveChannelId: string;
  archiveMessageId: string;
}

export interface ModerationAuditEvent {
  schemaVersion: number;
  eventType: ModerationAuditEventType;
  idempotencyKey: string;
  guildId: string;
  actorDiscordId: string;
  targetDiscordId: string;
  squadId: string;
  decision: SquadModerationDecision;
  originalOutcome: SquadResult;
  finalOutcome: SquadResult | null;
  sanction: ModerationAuditSanctionSnapshot | null;
  evidence: ModerationAuditEvidenceReference | null;
  occurredAt: Date;
  createdAt: Date;
}

export type CreateModerationAuditEventInput = Omit<
  ModerationAuditEvent,
  "createdAt"
>;
