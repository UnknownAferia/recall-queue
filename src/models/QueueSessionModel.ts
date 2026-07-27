import mongoose from "mongoose";

import { QueueSessionStatuses } from "../constants/queueActivation.js";
import type { QueueSession } from "../types/queueActivation.js";

const { Schema } = mongoose;

export type QueueSessionDocument = mongoose.HydratedDocument<QueueSession>;

const queueSessionSchema = new Schema<QueueSession>(
  {
    guildId: { type: String, required: true, trim: true },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 80,
    },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: QueueSessionStatuses,
      default: "scheduled",
    },
    createdByDiscordId: { type: String, required: true, trim: true },
    cancelledByDiscordId: { type: String, default: null, trim: true },
    cancelledAt: { type: Date, default: null },
    notificationClaimedAt: { type: Date, default: null },
    notifiedAt: { type: Date, default: null },
    notificationChannelId: { type: String, default: null, trim: true },
    notificationMessageId: { type: String, default: null, trim: true },
    notificationFinalizedAt: { type: Date, default: null },
    notificationDeletedAt: { type: Date, default: null },
  },
  {
    collection: "queue_sessions",
    timestamps: true,
    versionKey: false,
  },
);

queueSessionSchema.pre("validate", function validateWindow() {
  if (this.endsAt.getTime() <= this.startsAt.getTime()) {
    this.invalidate("endsAt", "A queue session must end after it starts.");
  }
});

queueSessionSchema.index(
  { guildId: 1, status: 1, startsAt: 1 },
  { name: "queue_session_schedule" },
);
queueSessionSchema.index(
  { status: 1, notificationClaimedAt: 1, startsAt: 1 },
  { name: "queue_session_notification_due" },
);
queueSessionSchema.index(
  { guildId: 1, status: 1, notificationFinalizedAt: 1 },
  { name: "queue_session_notification_finalization" },
);
queueSessionSchema.index(
  { guildId: 1, notificationFinalizedAt: 1, notificationDeletedAt: 1 },
  { name: "queue_session_notification_cleanup" },
);

export const QueueSessionModel: mongoose.Model<QueueSession> =
  mongoose.models.QueueSession ??
  mongoose.model<QueueSession>("QueueSession", queueSessionSchema);
