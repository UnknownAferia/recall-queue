import mongoose from "mongoose";

import { QueueConfig } from "../constants/queue.js";
import type { MatchmakingQueue, QueueEntry } from "../types/queue.js";

const { Schema } = mongoose;

export type QueueDocument = mongoose.HydratedDocument<MatchmakingQueue>;

const queueEntrySchema = new Schema<QueueEntry>(
  {
    discordId: {
      type: String,
      required: true,
      trim: true,
    },

    joinedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const queueSchema = new Schema<MatchmakingQueue>(
  {
    guildId: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      required: true,
      enum: ["open", "locked"],
      default: "open",
    },

    maximumPlayers: {
      type: Number,
      required: true,
      default: QueueConfig.maximumPlayers,
      min: QueueConfig.teamSize,
    },

    entries: {
      type: [queueEntrySchema],
      required: true,
      default: [],
    },
  },
  {
    collection: "queues",
    timestamps: true,
    versionKey: false,
  },
);

queueSchema.index(
  {
    guildId: 1,
  },
  {
    name: "unique_queue_guild",
    unique: true,
  },
);

export const QueueModel: mongoose.Model<MatchmakingQueue> =
  mongoose.models.MatchmakingQueue ??
  mongoose.model<MatchmakingQueue>("MatchmakingQueue", queueSchema);
