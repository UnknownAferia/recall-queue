import type { ModerationAuditDto } from "../dto/ModerationAuditDto.js";
import type { ModerationAuditDocument } from "../models/ModerationAuditModel.js";

export class ModerationAuditMapper {
  public static toDto(event: ModerationAuditDocument): ModerationAuditDto {
    return {
      id: event.id,
      schemaVersion: event.schemaVersion,
      eventType: event.eventType,
      guildId: event.guildId,
      actorDiscordId: event.actorDiscordId,
      targetDiscordId: event.targetDiscordId,
      squadId: event.squadId,
      decision: event.decision,
      originalOutcome: event.originalOutcome,
      finalOutcome: event.finalOutcome ?? null,
      sanction: event.sanction
        ? {
            action: event.sanction.action,
            behaviorScoreLoss: event.sanction.behaviorScoreLoss,
            integrityLevelBefore: event.sanction.integrityLevelBefore,
            integrityLevelAfter: event.sanction.integrityLevelAfter,
            bannedUntil: event.sanction.bannedUntil
              ? new Date(event.sanction.bannedUntil)
              : null,
          }
        : null,
      evidence: event.evidence
        ? {
            archiveChannelId: event.evidence.archiveChannelId,
            archiveMessageId: event.evidence.archiveMessageId,
          }
        : null,
      occurredAt: new Date(event.occurredAt),
      createdAt: new Date(event.createdAt),
    };
  }
}
