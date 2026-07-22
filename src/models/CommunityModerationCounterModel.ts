import mongoose from "mongoose";

import type { CommunityModerationCounter } from "../types/communityModeration.js";

const { Schema } = mongoose;

const communityModerationCounterSchema = new Schema<CommunityModerationCounter>(
  {
    guildId: { type: String, required: true, trim: true },
    kind: { type: String, required: true, enum: ["case", "report"] },
    sequence: { type: Number, required: true, min: 0, default: 0 },
  },
  {
    collection: "community_moderation_counters",
    timestamps: true,
    versionKey: false,
  },
);

communityModerationCounterSchema.index(
  { guildId: 1, kind: 1 },
  { name: "unique_community_moderation_counter", unique: true },
);

export const CommunityModerationCounterModel =
  mongoose.models.CommunityModerationCounter ??
  mongoose.model<CommunityModerationCounter>(
    "CommunityModerationCounter",
    communityModerationCounterSchema,
  );
