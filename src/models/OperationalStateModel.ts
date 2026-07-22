import mongoose from "mongoose";

import type { OperationalState } from "../types/operations.js";

const { Schema } = mongoose;

export type OperationalStateDocument =
  mongoose.HydratedDocument<OperationalState>;

const operationalStateSchema = new Schema<OperationalState>(
  {
    key: { type: String, required: true, enum: ["global"], default: "global" },
    registrationOpen: { type: Boolean, required: true, default: true },
    matchmakingOpen: { type: Boolean, required: true, default: true },
    reason: { type: String, default: null, trim: true, maxlength: 500 },
    changedByDiscordId: { type: String, default: null, trim: true },
    changedAt: { type: Date, required: true, default: Date.now },
  },
  {
    collection: "operational_states",
    timestamps: true,
    versionKey: false,
  },
);

operationalStateSchema.index(
  { key: 1 },
  { name: "unique_operational_state", unique: true },
);

export const OperationalStateModel: mongoose.Model<OperationalState> =
  mongoose.models.OperationalState ??
  mongoose.model<OperationalState>("OperationalState", operationalStateSchema);
