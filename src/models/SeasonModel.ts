import mongoose from "mongoose";

import { SeasonConfig, SeasonStatuses } from "../constants/season.js";
import type { Season, SeasonRules } from "../types/season.js";

const { Schema } = mongoose;

export type SeasonDocument = mongoose.HydratedDocument<Season>;

const seasonRulesSchema = new Schema<SeasonRules>(
  {
    baselineRsr: {
      type: Number,
      required: true,
      default: SeasonConfig.baselineRsr,
      min: 0,
    },
    placementMatches: {
      type: Number,
      required: true,
      default: SeasonConfig.placementMatches,
      min: 0,
    },
    softResetRetention: {
      type: Number,
      required: true,
      default: SeasonConfig.softResetRetention,
      min: 0,
      max: 1,
    },
  },
  { _id: false },
);

const seasonSchema = new Schema<Season>(
  {
    sequence: { type: Number, required: true, min: 1 },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 64,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    status: {
      type: String,
      required: true,
      enum: SeasonStatuses,
      default: "scheduled",
    },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    activatedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    createdByDiscordId: { type: String, required: true, trim: true },
    activatedByDiscordId: { type: String, default: null, trim: true },
    completedByDiscordId: { type: String, default: null, trim: true },
    rules: { type: seasonRulesSchema, required: true, default: () => ({}) },
  },
  {
    collection: "seasons",
    timestamps: true,
    versionKey: false,
  },
);

seasonSchema.pre("validate", function validateSeasonDates() {
  if (
    this.startsAt instanceof Date &&
    this.endsAt instanceof Date &&
    this.endsAt.getTime() <= this.startsAt.getTime()
  ) {
    this.invalidate("endsAt", "A season must end after it starts.");
  }
});

seasonSchema.index(
  { sequence: 1 },
  { name: "unique_season_sequence", unique: true },
);
seasonSchema.index({ slug: 1 }, { name: "unique_season_slug", unique: true });
seasonSchema.index(
  { status: 1 },
  {
    name: "unique_active_season",
    unique: true,
    partialFilterExpression: { status: "active" },
  },
);
seasonSchema.index(
  { status: 1, startsAt: 1 },
  { name: "season_lifecycle_schedule" },
);

export const SeasonModel: mongoose.Model<Season> =
  mongoose.models.Season ?? mongoose.model<Season>("Season", seasonSchema);
