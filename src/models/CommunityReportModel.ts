import mongoose from "mongoose";

import {
  CommunityReportStatuses,
  CommunityReportTypes,
} from "../constants/communityModeration.js";
import type {
  CommunityReport,
  CommunityReportEvidence,
} from "../types/communityModeration.js";

const { Schema } = mongoose;

export type CommunityReportDocument =
  mongoose.HydratedDocument<CommunityReport>;

const evidenceSchema = new Schema<CommunityReportEvidence>(
  {
    channelId: { type: String, default: null, trim: true },
    messageId: { type: String, default: null, trim: true },
    messageContent: { type: String, default: null, maxlength: 4_000 },
    attachmentUrls: { type: [String], required: true, default: [] },
  },
  { _id: false },
);

const communityReportSchema = new Schema<CommunityReport>(
  {
    schemaVersion: { type: Number, required: true, min: 1 },
    guildId: { type: String, required: true, trim: true },
    reportNumber: { type: Number, required: true, min: 1 },
    type: { type: String, required: true, enum: CommunityReportTypes },
    status: { type: String, required: true, enum: CommunityReportStatuses },
    reporterDiscordId: { type: String, required: true, trim: true },
    targetDiscordId: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 1_000 },
    evidence: { type: evidenceSchema, required: true, default: () => ({}) },
    resolutionCaseId: { type: String, default: null, trim: true },
    resolvedByDiscordId: { type: String, default: null, trim: true },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, default: null, trim: true, maxlength: 500 },
    purgeAt: { type: Date, default: null },
  },
  {
    collection: "community_reports",
    timestamps: true,
    versionKey: false,
  },
);

communityReportSchema.index(
  { guildId: 1, reportNumber: 1 },
  { name: "unique_community_report_number", unique: true },
);
communityReportSchema.index(
  { guildId: 1, status: 1, createdAt: 1 },
  { name: "community_report_inbox" },
);
communityReportSchema.index(
  { guildId: 1, targetDiscordId: 1, createdAt: -1 },
  { name: "community_report_target_history" },
);
communityReportSchema.index(
  { purgeAt: 1 },
  {
    name: "community_report_retention",
    expireAfterSeconds: 0,
    partialFilterExpression: { purgeAt: { $type: "date" } },
  },
);

export const CommunityReportModel =
  mongoose.models.CommunityReport ??
  mongoose.model<CommunityReport>("CommunityReport", communityReportSchema);
