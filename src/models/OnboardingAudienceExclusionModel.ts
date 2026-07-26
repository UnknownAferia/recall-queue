import mongoose from "mongoose";

import type { OnboardingAudienceExclusion } from "../types/community.js";

const { Schema } = mongoose;

export type OnboardingAudienceExclusionDocument =
  mongoose.HydratedDocument<OnboardingAudienceExclusion>;

const onboardingAudienceExclusionSchema =
  new Schema<OnboardingAudienceExclusion>(
    {
      guildId: { type: String, required: true, trim: true },
      memberDiscordId: { type: String, required: true, trim: true },
      active: { type: Boolean, required: true, default: true },
      reason: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 300,
      },
      changedByDiscordId: { type: String, required: true, trim: true },
      excludedAt: { type: Date, required: true },
      restoredAt: { type: Date, default: null },
    },
    {
      collection: "onboarding_audience_exclusions",
      timestamps: true,
      versionKey: false,
    },
  );

onboardingAudienceExclusionSchema.index(
  { guildId: 1, memberDiscordId: 1 },
  { name: "unique_onboarding_audience_member", unique: true },
);
onboardingAudienceExclusionSchema.index(
  { guildId: 1, active: 1, updatedAt: -1 },
  { name: "active_onboarding_audience" },
);

export const OnboardingAudienceExclusionModel: mongoose.Model<OnboardingAudienceExclusion> =
  mongoose.models.OnboardingAudienceExclusion ??
  mongoose.model<OnboardingAudienceExclusion>(
    "OnboardingAudienceExclusion",
    onboardingAudienceExclusionSchema,
  );
