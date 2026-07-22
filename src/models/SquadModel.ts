import mongoose from "mongoose";

import { IntegritySanctionActions } from "../constants/integrity.js";
import { PlayerRoles } from "../constants/playerRoles.js";
import {
  ReadyCheckStatuses,
  SquadLifecycleIncidentReasons,
  SquadModerationDecisions,
  SquadResults,
  SquadStatuses,
} from "../constants/squad.js";
import { MatchmakingConfig } from "../domain/matchmaking/MatchmakingConfig.js";
import type {
  SquadMetrics,
  SquadIntegritySanction,
  SquadLifecycleIncident,
  SquadModerationReview,
  SquadParticipant,
  SquadRatingChange,
  SquadResultEvidence,
  SquadResultReport,
  SquadSession,
} from "../types/squad.js";

const { Schema } = mongoose;

const RoleFits = ["primary", "secondary", "flexible", "avoided"] as const;

export type SquadDocument = mongoose.HydratedDocument<SquadSession>;

const participantSchema = new Schema<SquadParticipant>(
  {
    discordId: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    assignedRole: {
      type: String,
      required: true,
      enum: PlayerRoles,
    },
    roleFit: {
      type: String,
      required: true,
      enum: RoleFits,
    },
    rsrBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    behaviorScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    readyStatus: {
      type: String,
      required: true,
      enum: ReadyCheckStatuses,
      default: "pending",
    },
  },
  {
    _id: false,
  },
);

const metricsSchema = new Schema<SquadMetrics>(
  {
    averageRsr: {
      type: Number,
      required: true,
      min: 0,
    },
    rsrSpread: {
      type: Number,
      required: true,
      min: 0,
    },
    averageBehaviorScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    behaviorSpread: {
      type: Number,
      required: true,
      min: 0,
    },
    rolePenalty: {
      type: Number,
      required: true,
      min: 0,
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },
    compatibilityScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  {
    _id: false,
  },
);

const ratingChangeSchema = new Schema<SquadRatingChange>(
  {
    discordId: { type: String, required: true, trim: true },
    rsrBefore: { type: Number, required: true, min: 0 },
    rsrAfter: { type: Number, required: true, min: 0 },
    delta: { type: Number, required: true },
    confidenceBefore: { type: Number, required: true, min: 0, max: 100 },
    confidenceAfter: { type: Number, required: true, min: 0, max: 100 },
    expectedWinProbability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    kFactor: { type: Number, required: true, min: 0 },
    placementMatch: { type: Boolean, required: true },
  },
  { _id: false },
);

const integritySanctionSchema = new Schema<SquadIntegritySanction>(
  {
    action: {
      type: String,
      required: true,
      enum: IntegritySanctionActions,
    },
    targetDiscordId: { type: String, required: true, trim: true },
    behaviorScoreLoss: { type: Number, required: true, min: 0 },
    integrityLevelBefore: { type: Number, required: true, min: 0, max: 3 },
    integrityLevelAfter: { type: Number, required: true, min: 0, max: 3 },
    bannedUntil: { type: Date, default: null },
  },
  { _id: false },
);

const moderationReviewSchema = new Schema<SquadModerationReview>(
  {
    decision: {
      type: String,
      required: true,
      enum: SquadModerationDecisions,
    },
    originalOutcome: {
      type: String,
      required: true,
      enum: SquadResults,
    },
    finalOutcome: {
      type: String,
      enum: SquadResults,
      default: null,
    },
    moderatedByDiscordId: {
      type: String,
      required: true,
      trim: true,
    },
    moderatedAt: {
      type: Date,
      required: true,
    },
    sanction: {
      type: integritySanctionSchema,
      default: null,
    },
  },
  { _id: false },
);

const resultEvidenceSchema = new Schema<SquadResultEvidence>(
  {
    archiveChannelId: { type: String, required: true, trim: true },
    archiveMessageId: { type: String, required: true, trim: true },
    archiveAttachmentId: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    contentType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 1 },
    submittedByDiscordId: { type: String, required: true, trim: true },
    submittedAt: { type: Date, required: true },
  },
  { _id: false },
);

const resultSchema = new Schema<SquadResultReport>(
  {
    outcome: {
      type: String,
      required: true,
      enum: SquadResults,
    },
    reportedByDiscordId: {
      type: String,
      required: true,
      trim: true,
    },
    reportedAt: {
      type: Date,
      required: true,
    },
    confirmedByDiscordIds: {
      type: [String],
      required: true,
      default: [],
    },
    disputedByDiscordIds: {
      type: [String],
      required: true,
      default: [],
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    statisticsProcessedAt: {
      type: Date,
      default: null,
    },
    ratingChanges: {
      type: [ratingChangeSchema],
      required: true,
      default: [],
    },
    moderation: {
      type: moderationReviewSchema,
      default: null,
    },
    evidence: {
      type: resultEvidenceSchema,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const lifecycleIncidentSchema = new Schema<SquadLifecycleIncident>(
  {
    reason: {
      type: String,
      required: true,
      enum: SquadLifecycleIncidentReasons,
    },
    responsibleDiscordIds: {
      type: [String],
      required: true,
      validate: {
        validator: (discordIds: string[]) =>
          discordIds.length > 0 &&
          new Set(discordIds).size === discordIds.length,
        message: "A lifecycle incident requires unique responsible players.",
      },
    },
    occurredAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false },
);

const squadSchema = new Schema<SquadSession>(
  {
    guildId: {
      type: String,
      required: true,
      trim: true,
    },
    sourceQueueKey: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: SquadStatuses,
      default: "ready_check",
    },
    captainDiscordId: {
      type: String,
      required: true,
      trim: true,
    },
    voiceChannelId: {
      type: String,
      default: null,
      trim: true,
    },
    participants: {
      type: [participantSchema],
      required: true,
      validate: {
        validator: (participants: SquadParticipant[]) => {
          const discordIds = participants.map(
            (participant) => participant.discordId,
          );

          const assignedRoles = participants.map(
            (participant) => participant.assignedRole,
          );

          return (
            participants.length === MatchmakingConfig.playersPerTeam &&
            new Set(discordIds).size === discordIds.length &&
            new Set(assignedRoles).size === assignedRoles.length
          );
        },
        message: "A squad requires five unique players and five unique roles.",
      },
    },
    metrics: {
      type: metricsSchema,
      required: true,
    },
    result: {
      type: resultSchema,
      default: null,
    },
    readyCheckExpiresAt: {
      type: Date,
      required: true,
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    resultReportExpiresAt: {
      type: Date,
      default: null,
    },
    resultConfirmationExpiresAt: {
      type: Date,
      default: null,
    },
    lifecycleIncident: {
      type: lifecycleIncidentSchema,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedByDiscordId: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    collection: "squads",
    timestamps: true,
    versionKey: false,
  },
);

squadSchema.pre("validate", function validateCaptain() {
  const captainIsParticipant = this.participants.some(
    (participant) => participant.discordId === this.captainDiscordId,
  );

  if (!captainIsParticipant) {
    this.invalidate(
      "captainDiscordId",
      "The squad captain must be one of its participants.",
    );
  }

  const participantIds = new Set(
    this.participants.map((participant) => participant.discordId),
  );

  const incidentIds = this.lifecycleIncident?.responsibleDiscordIds ?? [];

  if (
    incidentIds.some((discordId) => !participantIds.has(discordId)) ||
    new Set(incidentIds).size !== incidentIds.length
  ) {
    this.invalidate(
      "lifecycleIncident",
      "Lifecycle incidents may reference only unique squad participants.",
    );
  }

  if (!this.result) {
    return;
  }

  const responseIds = [
    ...this.result.confirmedByDiscordIds,
    ...this.result.disputedByDiscordIds,
  ];

  const resultIsValid =
    participantIds.has(this.result.reportedByDiscordId) &&
    responseIds.every((discordId) => participantIds.has(discordId)) &&
    new Set(responseIds).size === responseIds.length;

  const ratingChangeIds = (this.result.ratingChanges ?? []).map(
    (change) => change.discordId,
  );
  const ratingChangesAreValid =
    (ratingChangeIds.length === 0 ||
      ratingChangeIds.length === this.participants.length) &&
    ratingChangeIds.every((discordId) => participantIds.has(discordId)) &&
    new Set(ratingChangeIds).size === ratingChangeIds.length;
  const sanction = this.result.moderation?.sanction;
  const sanctionIsValid =
    !sanction ||
    (sanction.targetDiscordId === this.result.reportedByDiscordId &&
      (sanction.action === "none"
        ? sanction.behaviorScoreLoss === 0 &&
          sanction.integrityLevelAfter === sanction.integrityLevelBefore &&
          sanction.bannedUntil === null
        : sanction.behaviorScoreLoss > 0 &&
          sanction.integrityLevelAfter >= sanction.integrityLevelBefore &&
          sanction.bannedUntil !== null));

  if (!resultIsValid || !ratingChangesAreValid || !sanctionIsValid) {
    this.invalidate(
      "result",
      "Result and moderation data must belong to valid squad participants.",
    );
  }
});

squadSchema.index(
  {
    sourceQueueKey: 1,
  },
  {
    name: "unique_squad_source_queue",
    unique: true,
  },
);

squadSchema.index(
  {
    status: 1,
    resultReportExpiresAt: 1,
  },
  {
    name: "squad_result_report_expiration",
  },
);

squadSchema.index(
  {
    status: 1,
    resultConfirmationExpiresAt: 1,
  },
  {
    name: "squad_result_confirmation_expiration",
  },
);

squadSchema.index(
  {
    guildId: 1,
    status: 1,
    "participants.discordId": 1,
  },
  {
    name: "active_player_squad",
  },
);

squadSchema.index(
  {
    "participants.discordId": 1,
    createdAt: -1,
  },
  {
    name: "player_squad_history",
  },
);

squadSchema.index(
  {
    status: 1,
    readyCheckExpiresAt: 1,
  },
  {
    name: "squad_ready_check_expiration",
  },
);

export const SquadModel: mongoose.Model<SquadSession> =
  mongoose.models.SquadSession ??
  mongoose.model<SquadSession>("SquadSession", squadSchema);
