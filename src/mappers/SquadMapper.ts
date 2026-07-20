import type { SquadDto } from "../dto/SquadDto.js";
import type { SquadDocument } from "../models/SquadModel.js";

export class SquadMapper {
  public static toDto(squad: SquadDocument): SquadDto {
    return {
      id: squad.id,
      guildId: squad.guildId,
      status: squad.status,
      captainDiscordId: squad.captainDiscordId,
      voiceChannelId: squad.voiceChannelId ?? null,
      participants: squad.participants.map((participant) => ({
        discordId: participant.discordId,
        displayName: participant.displayName,
        assignedRole: participant.assignedRole,
        roleFit: participant.roleFit,
        rsrBefore: participant.rsrBefore,
        behaviorScore: participant.behaviorScore,
        readyStatus: participant.readyStatus,
      })),
      metrics: {
        averageRsr: squad.metrics.averageRsr,
        rsrSpread: squad.metrics.rsrSpread,
        averageBehaviorScore: squad.metrics.averageBehaviorScore,
        behaviorSpread: squad.metrics.behaviorSpread,
        rolePenalty: squad.metrics.rolePenalty,
        totalCost: squad.metrics.totalCost,
        compatibilityScore: squad.metrics.compatibilityScore,
      },
      result: squad.result
        ? {
            outcome: squad.result.outcome,
            reportedByDiscordId: squad.result.reportedByDiscordId,
            reportedAt: new Date(squad.result.reportedAt),
            confirmedByDiscordIds: [...squad.result.confirmedByDiscordIds],
            disputedByDiscordIds: [...squad.result.disputedByDiscordIds],
            verifiedAt: squad.result.verifiedAt
              ? new Date(squad.result.verifiedAt)
              : null,
            statisticsProcessedAt: squad.result.statisticsProcessedAt
              ? new Date(squad.result.statisticsProcessedAt)
              : null,
            ratingChanges: (squad.result.ratingChanges ?? []).map((change) => ({
              discordId: change.discordId,
              rsrBefore: change.rsrBefore,
              rsrAfter: change.rsrAfter,
              delta: change.delta,
              confidenceBefore: change.confidenceBefore,
              confidenceAfter: change.confidenceAfter,
              expectedWinProbability: change.expectedWinProbability,
              kFactor: change.kFactor,
              placementMatch: change.placementMatch,
            })),
            moderation: squad.result.moderation
              ? {
                  decision: squad.result.moderation.decision,
                  originalOutcome: squad.result.moderation.originalOutcome,
                  finalOutcome: squad.result.moderation.finalOutcome ?? null,
                  moderatedByDiscordId:
                    squad.result.moderation.moderatedByDiscordId,
                  moderatedAt: new Date(squad.result.moderation.moderatedAt),
                  sanction: squad.result.moderation.sanction
                    ? {
                        action: squad.result.moderation.sanction.action,
                        targetDiscordId:
                          squad.result.moderation.sanction.targetDiscordId,
                        behaviorScoreLoss:
                          squad.result.moderation.sanction.behaviorScoreLoss,
                        integrityLevelBefore:
                          squad.result.moderation.sanction.integrityLevelBefore,
                        integrityLevelAfter:
                          squad.result.moderation.sanction.integrityLevelAfter,
                        bannedUntil: squad.result.moderation.sanction.bannedUntil
                          ? new Date(
                              squad.result.moderation.sanction.bannedUntil,
                            )
                          : null,
                      }
                    : null,
                }
              : null,
            evidence: squad.result.evidence
              ? {
                  archiveChannelId: squad.result.evidence.archiveChannelId,
                  archiveMessageId: squad.result.evidence.archiveMessageId,
                  archiveAttachmentId:
                    squad.result.evidence.archiveAttachmentId,
                  fileName: squad.result.evidence.fileName,
                  contentType: squad.result.evidence.contentType,
                  size: squad.result.evidence.size,
                  submittedByDiscordId:
                    squad.result.evidence.submittedByDiscordId,
                  submittedAt: new Date(squad.result.evidence.submittedAt),
                }
              : null,
          }
        : null,
      readyCheckExpiresAt: new Date(squad.readyCheckExpiresAt),
      activatedAt: squad.activatedAt ? new Date(squad.activatedAt) : null,
      closedAt: squad.closedAt ? new Date(squad.closedAt) : null,
      closedByDiscordId: squad.closedByDiscordId ?? null,
      createdAt: new Date(squad.createdAt),
      updatedAt: new Date(squad.updatedAt),
    };
  }
}
