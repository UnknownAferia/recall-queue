import mongoose from "mongoose";

import type { ScrimListing } from "../types/scrim.js";

const { Schema } = mongoose;

export type ScrimListingDocument = mongoose.HydratedDocument<ScrimListing>;

const scrimListingSchema = new Schema<ScrimListing>(
  {
    guildId: { type: String, required: true, trim: true },
    captainDiscordId: { type: String, required: true, trim: true },
    teamName: { type: String, required: true, trim: true, maxlength: 40 },
    region: {
      type: String,
      required: true,
      enum: ["eu", "na", "sea", "other"],
    },
    availability: { type: String, required: true, trim: true, maxlength: 80 },
    notes: { type: String, default: null, trim: true, maxlength: 200 },
    status: { type: String, required: true, enum: ["open", "closed"] },
    expiresAt: { type: Date, required: true },
    closedAt: { type: Date, default: null },
  },
  { collection: "scrim_listings", timestamps: true, versionKey: false },
);

scrimListingSchema.index(
  { guildId: 1, captainDiscordId: 1, status: 1 },
  { name: "scrim_captain_status" },
);
scrimListingSchema.index(
  { guildId: 1, status: 1, region: 1, expiresAt: 1 },
  { name: "scrim_discovery" },
);
scrimListingSchema.index(
  { expiresAt: 1 },
  { name: "scrim_expiry", expireAfterSeconds: 0 },
);

export const ScrimListingModel: mongoose.Model<ScrimListing> =
  mongoose.models.ScrimListing ??
  mongoose.model<ScrimListing>("ScrimListing", scrimListingSchema);
