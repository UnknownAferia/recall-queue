import mongoose from "mongoose";

import {
  CommunityModerationActions,
  CommunityModerationCaseStatuses,
  CommunityModerationSources,
} from "../constants/communityModeration.js";
import type { CommunityModerationCase } from "../types/communityModeration.js";

const { Schema } = mongoose;

export type CommunityModerationCaseDocument =
  mongoose.HydratedDocument<CommunityModerationCase>;

const communityModerationCaseSchema = new Schema<CommunityModerationCase>(
  {
    schemaVersion: { type: Number, required: true, min: 1 },
    guildId: { type: String, required: true, trim: true },
    caseNumber: { type: Number, required: true, min: 1 },
    source: {
      type: String,
      required: true,
      enum: CommunityModerationSources,
    },
    action: {
      type: String,
      required: true,
      enum: CommunityModerationActions,
    },
    status: {
      type: String,
      required: true,
      enum: CommunityModerationCaseStatuses,
    },
    actorDiscordId: { type: String, default: null, trim: true },
    targetDiscordId: { type: String, default: null, trim: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    durationMs: { type: Number, default: null, min: 1 },
    expiresAt: { type: Date, default: null },
    pendingUntil: { type: Date, default: null },
    relatedReportId: { type: String, default: null, trim: true },
    channelId: { type: String, default: null, trim: true },
    messageId: { type: String, default: null, trim: true },
    details: { type: Schema.Types.Mixed, required: true, default: {} },
    completedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    failureReason: { type: String, default: null, trim: true, maxlength: 500 },
    reversedAt: { type: Date, default: null },
    reversedByDiscordId: { type: String, default: null, trim: true },
    reversalReason: { type: String, default: null, trim: true, maxlength: 500 },
    purgeAt: { type: Date, default: null },
  },
  {
    collection: "community_moderation_cases",
    timestamps: true,
    versionKey: false,
  },
);

communityModerationCaseSchema.index(
  { guildId: 1, caseNumber: 1 },
  { name: "unique_community_case_number", unique: true },
);
communityModerationCaseSchema.index(
  { guildId: 1, targetDiscordId: 1, createdAt: -1 },
  { name: "community_target_history" },
);
communityModerationCaseSchema.index(
  { guildId: 1, status: 1, pendingUntil: 1 },
  { name: "community_pending_actions" },
);
communityModerationCaseSchema.index(
  { purgeAt: 1 },
  {
    name: "community_case_retention",
    expireAfterSeconds: 0,
    partialFilterExpression: { purgeAt: { $type: "date" } },
  },
);

export const CommunityModerationCaseModel =
  mongoose.models.CommunityModerationCase ??
  mongoose.model<CommunityModerationCase>(
    "CommunityModerationCase",
    communityModerationCaseSchema,
  );
