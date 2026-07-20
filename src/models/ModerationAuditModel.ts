import mongoose from "mongoose";

import { IntegritySanctionActions } from "../constants/integrity.js";
import { ModerationAuditEventTypes } from "../constants/moderationAudit.js";
import { SquadModerationDecisions, SquadResults } from "../constants/squad.js";
import type {
  ModerationAuditEvent,
  ModerationAuditEvidenceReference,
  ModerationAuditSanctionSnapshot,
} from "../types/moderationAudit.js";

const { Schema } = mongoose;

export type ModerationAuditDocument =
  mongoose.HydratedDocument<ModerationAuditEvent>;

const sanctionSchema = new Schema<ModerationAuditSanctionSnapshot>(
  {
    action: {
      type: String,
      required: true,
      enum: IntegritySanctionActions,
    },
    behaviorScoreLoss: { type: Number, required: true, min: 0 },
    integrityLevelBefore: { type: Number, required: true, min: 0, max: 3 },
    integrityLevelAfter: { type: Number, required: true, min: 0, max: 3 },
    bannedUntil: { type: Date, default: null },
  },
  { _id: false },
);

const evidenceSchema = new Schema<ModerationAuditEvidenceReference>(
  {
    archiveChannelId: { type: String, required: true, trim: true },
    archiveMessageId: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const moderationAuditSchema = new Schema<ModerationAuditEvent>(
  {
    schemaVersion: { type: Number, required: true, min: 1 },
    eventType: {
      type: String,
      required: true,
      enum: ModerationAuditEventTypes,
    },
    idempotencyKey: { type: String, required: true, trim: true },
    guildId: { type: String, required: true, trim: true },
    actorDiscordId: { type: String, required: true, trim: true },
    targetDiscordId: { type: String, required: true, trim: true },
    squadId: { type: String, required: true, trim: true },
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
    sanction: { type: sanctionSchema, default: null },
    evidence: { type: evidenceSchema, default: null },
    occurredAt: { type: Date, required: true },
  },
  {
    collection: "moderation_audit_events",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

moderationAuditSchema.index(
  { idempotencyKey: 1 },
  { name: "unique_moderation_audit_event", unique: true },
);
moderationAuditSchema.index(
  { guildId: 1, occurredAt: -1 },
  { name: "guild_moderation_audit_history" },
);
moderationAuditSchema.index(
  { guildId: 1, targetDiscordId: 1, occurredAt: -1 },
  { name: "player_moderation_audit_history" },
);

export const ModerationAuditModel: mongoose.Model<ModerationAuditEvent> =
  mongoose.models.ModerationAuditEvent ??
  mongoose.model<ModerationAuditEvent>(
    "ModerationAuditEvent",
    moderationAuditSchema,
  );
