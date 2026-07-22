import type {
  ReadyCheckStatus,
  SquadLifecycleIncidentReason,
  SquadModerationDecision,
  SquadResult,
  SquadStatus,
} from "../constants/squad.js";
import type { PlayerRole } from "../constants/playerRoles.js";
import type { IntegritySanctionAction } from "../constants/integrity.js";
import type { RoleFit } from "../domain/matchmaking/MatchmakingCandidate.js";

export interface SquadParticipantDto {
  readonly discordId: string;
  readonly displayName: string;
  readonly assignedRole: PlayerRole;
  readonly roleFit: RoleFit;
  readonly rsrBefore: number;
  readonly behaviorScore: number;
  readonly readyStatus: ReadyCheckStatus;
}

export interface SquadMetricsDto {
  readonly averageRsr: number;
  readonly rsrSpread: number;
  readonly averageBehaviorScore: number;
  readonly behaviorSpread: number;
  readonly rolePenalty: number;
  readonly totalCost: number;
  readonly compatibilityScore: number;
}

export interface SquadResultReportDto {
  readonly outcome: SquadResult;
  readonly reportedByDiscordId: string;
  readonly reportedAt: Date;
  readonly confirmedByDiscordIds: readonly string[];
  readonly disputedByDiscordIds: readonly string[];
  readonly verifiedAt: Date | null;
  readonly statisticsProcessedAt: Date | null;
  readonly ratingChanges: readonly SquadRatingChangeDto[];
  readonly moderation: SquadModerationReviewDto | null;
  readonly evidence: SquadResultEvidenceDto | null;
}

export interface SquadResultEvidenceDto {
  readonly archiveChannelId: string;
  readonly archiveMessageId: string;
  readonly archiveAttachmentId: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly size: number;
  readonly submittedByDiscordId: string;
  readonly submittedAt: Date;
}

export interface SquadModerationReviewDto {
  readonly decision: SquadModerationDecision;
  readonly originalOutcome: SquadResult;
  readonly finalOutcome: SquadResult | null;
  readonly moderatedByDiscordId: string;
  readonly moderatedAt: Date;
  readonly sanction: SquadIntegritySanctionDto | null;
}

export interface SquadIntegritySanctionDto {
  readonly action: IntegritySanctionAction;
  readonly targetDiscordId: string;
  readonly behaviorScoreLoss: number;
  readonly integrityLevelBefore: number;
  readonly integrityLevelAfter: number;
  readonly bannedUntil: Date | null;
}

export interface SquadRatingChangeDto {
  readonly discordId: string;
  readonly rsrBefore: number;
  readonly rsrAfter: number;
  readonly delta: number;
  readonly confidenceBefore: number;
  readonly confidenceAfter: number;
  readonly expectedWinProbability: number;
  readonly kFactor: number;
  readonly placementMatch: boolean;
}

export interface SquadLifecycleIncidentDto {
  readonly reason: SquadLifecycleIncidentReason;
  readonly responsibleDiscordIds: readonly string[];
  readonly occurredAt: Date;
}

export interface SquadDto {
  readonly id: string;
  readonly guildId: string;
  readonly status: SquadStatus;
  readonly captainDiscordId: string;
  readonly voiceChannelId: string | null;
  readonly participants: readonly SquadParticipantDto[];
  readonly metrics: SquadMetricsDto;
  readonly result: SquadResultReportDto | null;
  readonly readyCheckExpiresAt: Date;
  readonly activatedAt: Date | null;
  readonly resultReportExpiresAt?: Date | null;
  readonly resultConfirmationExpiresAt?: Date | null;
  readonly lifecycleIncident?: SquadLifecycleIncidentDto | null;
  readonly closedAt: Date | null;
  readonly closedByDiscordId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
