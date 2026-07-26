import mongoose from "mongoose";

import type { MemberOnboardingContact } from "../types/community.js";

const { Schema } = mongoose;

export type MemberOnboardingDocument =
  mongoose.HydratedDocument<MemberOnboardingContact>;

const memberOnboardingSchema = new Schema<MemberOnboardingContact>(
  {
    guildId: { type: String, required: true, trim: true },
    memberDiscordId: { type: String, required: true, trim: true },
    reminderCount: { type: Number, required: true, min: 0, default: 0 },
    lastReminderAt: { type: Date, required: true },
    lastDeliverySucceeded: { type: Boolean, required: true },
    lastFailureReason: { type: String, default: null, maxlength: 500 },
  },
  {
    collection: "member_onboarding",
    timestamps: true,
    versionKey: false,
  },
);

memberOnboardingSchema.index(
  { guildId: 1, memberDiscordId: 1 },
  { name: "unique_member_onboarding", unique: true },
);
memberOnboardingSchema.index(
  { guildId: 1, lastReminderAt: 1 },
  { name: "onboarding_reminder_due" },
);

export const MemberOnboardingModel: mongoose.Model<MemberOnboardingContact> =
  mongoose.models.MemberOnboarding ??
  mongoose.model<MemberOnboardingContact>(
    "MemberOnboarding",
    memberOnboardingSchema,
  );
