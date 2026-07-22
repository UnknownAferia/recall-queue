import mongoose from "mongoose";

import { SeasonAchievements } from "../constants/season.js";
import type { SeasonMembership } from "../types/season.js";

const { Schema } = mongoose;

export type SeasonMembershipDocument =
  mongoose.HydratedDocument<SeasonMembership>;

const seasonMembershipSchema = new Schema<SeasonMembership>(
  {
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    playerId: {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },
    discordId: { type: String, required: true, trim: true },
    ign: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 32,
      default: "Unknown Player",
    },
    initialRsr: { type: Number, required: true, min: 0 },
    currentRsr: { type: Number, required: true, min: 0 },
    peakRsr: { type: Number, required: true, min: 0 },
    finalRsr: { type: Number, default: null, min: 0 },
    finalRank: { type: Number, default: null, min: 1 },
    achievements: {
      type: [{ type: String, enum: SeasonAchievements }],
      required: true,
      default: [],
    },
    matchesPlayed: { type: Number, required: true, min: 0, default: 0 },
    wins: { type: Number, required: true, min: 0, default: 0 },
    losses: { type: Number, required: true, min: 0, default: 0 },
    joinedAt: { type: Date, required: true },
    lastMatchAt: { type: Date, required: true },
  },
  {
    collection: "season_memberships",
    versionKey: false,
  },
);

seasonMembershipSchema.pre("validate", function validateSeasonStatistics() {
  if (this.wins + this.losses !== this.matchesPlayed) {
    this.invalidate(
      "matchesPlayed",
      "Season wins and losses must equal matches played.",
    );
  }

  if (this.peakRsr < this.initialRsr || this.peakRsr < this.currentRsr) {
    this.invalidate("peakRsr", "Season peak RSR cannot be below recorded RSR.");
  }
});

seasonMembershipSchema.index(
  { seasonId: 1, playerId: 1 },
  { name: "unique_season_player", unique: true },
);
seasonMembershipSchema.index(
  { seasonId: 1, currentRsr: -1, matchesPlayed: -1 },
  { name: "season_leaderboard" },
);
seasonMembershipSchema.index(
  { playerId: 1, seasonId: -1 },
  { name: "player_season_history" },
);
seasonMembershipSchema.index(
  { seasonId: 1, finalRank: 1 },
  { name: "season_final_rank" },
);
seasonMembershipSchema.index(
  { seasonId: 1, achievements: 1 },
  { name: "season_achievements" },
);

export const SeasonMembershipModel: mongoose.Model<SeasonMembership> =
  mongoose.models.SeasonMembership ??
  mongoose.model<SeasonMembership>("SeasonMembership", seasonMembershipSchema);
