import type {
  ReadyCheckStatus,
  SquadModerationDecision,
  SquadResult,
  SquadStatus,
} from "../constants/squad.js";
import type { PlayerRole } from "../constants/playerRoles.js";
import type { IntegritySanctionAction } from "../constants/integrity.js";
import type { RoleFit } from "../domain/matchmaking/MatchmakingCandidate.js";

export interface SquadParticipant {
  discordId: string;
  displayName: string;
  assignedRole: PlayerRole;
  roleFit: RoleFit;
  rsrBefore: number;
  behaviorScore: number;
  readyStatus: ReadyCheckStatus;
}

export interface SquadMetrics {
  averageRsr: number;
  rsrSpread: number;
  averageBehaviorScore: number;
  behaviorSpread: number;
  rolePenalty: number;
  totalCost: number;
  compatibilityScore: number;
}

export interface SquadResultReport {
  outcome: SquadResult;
  reportedByDiscordId: string;
  reportedAt: Date;
  confirmedByDiscordIds: string[];
  disputedByDiscordIds: string[];
  verifiedAt: Date | null;
  statisticsProcessedAt: Date | null;
  ratingChanges: SquadRatingChange[];
  moderation: SquadModerationReview | null;
  evidence: SquadResultEvidence | null;
}

export interface SquadResultEvidence {
  archiveChannelId: string;
  archiveMessageId: string;
  archiveAttachmentId: string;
  fileName: string;
  contentType: string;
  size: number;
  submittedByDiscordId: string;
  submittedAt: Date;
}

export interface SquadModerationReview {
  decision: SquadModerationDecision;
  originalOutcome: SquadResult;
  finalOutcome: SquadResult | null;
  moderatedByDiscordId: string;
  moderatedAt: Date;
  sanction: SquadIntegritySanction | null;
}

export interface SquadIntegritySanction {
  action: IntegritySanctionAction;
  targetDiscordId: string;
  behaviorScoreLoss: number;
  integrityLevelBefore: number;
  integrityLevelAfter: number;
  bannedUntil: Date | null;
}

export interface SquadRatingChange {
  discordId: string;
  rsrBefore: number;
  rsrAfter: number;
  delta: number;
  confidenceBefore: number;
  confidenceAfter: number;
  expectedWinProbability: number;
  kFactor: number;
  placementMatch: boolean;
}

export interface SquadSession {
  guildId: string;
  sourceQueueKey: string;
  status: SquadStatus;
  captainDiscordId: string;
  voiceChannelId: string | null;
  participants: SquadParticipant[];
  metrics: SquadMetrics;
  result: SquadResultReport | null;
  readyCheckExpiresAt: Date;
  activatedAt: Date | null;
  closedAt: Date | null;
  closedByDiscordId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
