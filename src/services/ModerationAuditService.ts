import type { ClientSession } from "mongoose";

import { ModerationAuditConfig } from "../constants/moderationAudit.js";
import type { ModerationAuditDto } from "../dto/ModerationAuditDto.js";
import { ModerationAuditMapper } from "../mappers/ModerationAuditMapper.js";
import type { SquadDocument } from "../models/SquadModel.js";
import type { ModerationAuditRepository } from "../repositories/ModerationAuditRepository.js";

export class ModerationAuditService {
  public constructor(private readonly repository: ModerationAuditRepository) {}

  public async recordDisputeResolution(
    squad: SquadDocument,
    session: ClientSession,
  ): Promise<ModerationAuditDto> {
    const result = squad.result;
    const moderation = result?.moderation;

    if (!result || !moderation) {
      throw new Error(
        `Squad ${squad.id} has no completed moderation decision to audit.`,
      );
    }

    const event = await this.repository.create(
      {
        schemaVersion: ModerationAuditConfig.schemaVersion,
        eventType: "dispute_resolved",
        idempotencyKey: `dispute-resolution:${squad.id}`,
        guildId: squad.guildId,
        actorDiscordId: moderation.moderatedByDiscordId,
        targetDiscordId:
          moderation.sanction?.targetDiscordId ?? result.reportedByDiscordId,
        squadId: squad.id,
        decision: moderation.decision,
        originalOutcome: moderation.originalOutcome,
        finalOutcome: moderation.finalOutcome ?? null,
        sanction: moderation.sanction
          ? {
              action: moderation.sanction.action,
              behaviorScoreLoss: moderation.sanction.behaviorScoreLoss,
              integrityLevelBefore: moderation.sanction.integrityLevelBefore,
              integrityLevelAfter: moderation.sanction.integrityLevelAfter,
              bannedUntil: moderation.sanction.bannedUntil
                ? new Date(moderation.sanction.bannedUntil)
                : null,
            }
          : null,
        evidence: result.evidence
          ? {
              archiveChannelId: result.evidence.archiveChannelId,
              archiveMessageId: result.evidence.archiveMessageId,
            }
          : null,
        occurredAt: new Date(moderation.moderatedAt),
      },
      session,
    );

    return ModerationAuditMapper.toDto(event);
  }

  public async getRecent(
    guildId: string,
    targetDiscordId?: string,
  ): Promise<ModerationAuditDto[]> {
    const events = await this.repository.findRecentByGuild(
      guildId,
      targetDiscordId,
      ModerationAuditConfig.recentEventLimit,
    );

    return events.map((event) => ModerationAuditMapper.toDto(event));
  }
}
