import mongoose from "mongoose";

import { CommunityPanelKinds } from "../constants/community.js";
import type { CommunityPanelRecord } from "../types/community.js";

const { Schema } = mongoose;

export type CommunityPanelDocument =
  mongoose.HydratedDocument<CommunityPanelRecord>;

const communityPanelSchema = new Schema<CommunityPanelRecord>(
  {
    guildId: { type: String, required: true, trim: true },
    kind: {
      type: String,
      required: true,
      enum: CommunityPanelKinds,
    },
    channelId: { type: String, required: true, trim: true },
    messageId: { type: String, required: true, trim: true },
  },
  {
    collection: "community_panels",
    timestamps: true,
    versionKey: false,
  },
);

communityPanelSchema.index(
  { guildId: 1, kind: 1 },
  { name: "unique_community_panel", unique: true },
);

export const CommunityPanelModel: mongoose.Model<CommunityPanelRecord> =
  mongoose.models.CommunityPanel ??
  mongoose.model<CommunityPanelRecord>("CommunityPanel", communityPanelSchema);
