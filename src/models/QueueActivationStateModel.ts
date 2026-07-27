import mongoose from "mongoose";

import type { QueueActivationState } from "../types/queueActivation.js";

const { Schema } = mongoose;

export type QueueActivationStateDocument =
  mongoose.HydratedDocument<QueueActivationState>;

const queueActivationStateSchema = new Schema<QueueActivationState>(
  {
    guildId: { type: String, required: true, trim: true },
    lastObservedPlayers: { type: Number, required: true, min: 0, default: 0 },
    lastNotifiedMilestone: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lastNotifiedAt: { type: Date, default: null },
    notificationChannelId: { type: String, default: null, trim: true },
    notificationMessageId: { type: String, default: null, trim: true },
  },
  {
    collection: "queue_activation_states",
    timestamps: true,
    versionKey: false,
  },
);

queueActivationStateSchema.index(
  { guildId: 1 },
  { name: "unique_queue_activation_guild", unique: true },
);

export const QueueActivationStateModel: mongoose.Model<QueueActivationState> =
  mongoose.models.QueueActivationState ??
  mongoose.model<QueueActivationState>(
    "QueueActivationState",
    queueActivationStateSchema,
  );
