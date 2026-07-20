import type { IntegritySanctionAction } from "../constants/integrity.js";
import type { ModerationAuditEventType } from "../constants/moderationAudit.js";
import type {
  SquadModerationDecision,
  SquadResult,
} from "../constants/squad.js";

export interface ModerationAuditDto {
  readonly id: string;
  readonly schemaVersion: number;
  readonly eventType: ModerationAuditEventType;
  readonly guildId: string;
  readonly actorDiscordId: string;
  readonly targetDiscordId: string;
  readonly squadId: string;
  readonly decision: SquadModerationDecision;
  readonly originalOutcome: SquadResult;
  readonly finalOutcome: SquadResult | null;
  readonly sanction: {
    readonly action: IntegritySanctionAction;
    readonly behaviorScoreLoss: number;
    readonly integrityLevelBefore: number;
    readonly integrityLevelAfter: number;
    readonly bannedUntil: Date | null;
  } | null;
  readonly evidence: {
    readonly archiveChannelId: string;
    readonly archiveMessageId: string;
  } | null;
  readonly occurredAt: Date;
  readonly createdAt: Date;
}
