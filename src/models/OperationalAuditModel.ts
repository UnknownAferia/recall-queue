import mongoose from "mongoose";

import { OperationalAuditEventTypes } from "../constants/operationalAudit.js";
import type { OperationalAuditEvent } from "../types/community.js";

const { Schema } = mongoose;

export type OperationalAuditDocument =
  mongoose.HydratedDocument<OperationalAuditEvent>;

const operationalAuditSchema = new Schema<OperationalAuditEvent>(
  {
    schemaVersion: { type: Number, required: true, min: 1 },
    eventType: {
      type: String,
      required: true,
      enum: OperationalAuditEventTypes,
    },
    guildId: { type: String, required: true, trim: true },
    actorDiscordId: { type: String, default: null, trim: true },
    subjectType: {
      type: String,
      required: true,
      enum: ["support_ticket", "community_service", "system"],
    },
    subjectId: { type: String, required: true, trim: true },
    details: { type: Schema.Types.Mixed, required: true, default: {} },
    occurredAt: { type: Date, required: true },
  },
  {
    collection: "operational_audit_events",
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

operationalAuditSchema.index(
  { guildId: 1, occurredAt: -1 },
  { name: "guild_operational_audit_history" },
);
operationalAuditSchema.index(
  { subjectType: 1, subjectId: 1, occurredAt: -1 },
  { name: "subject_operational_audit_history" },
);

export const OperationalAuditModel: mongoose.Model<OperationalAuditEvent> =
  mongoose.models.OperationalAuditEvent ??
  mongoose.model<OperationalAuditEvent>(
    "OperationalAuditEvent",
    operationalAuditSchema,
  );
