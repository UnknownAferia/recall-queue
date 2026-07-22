import mongoose from "mongoose";

import { PlayerDefaults } from "../constants/playerDefaults.js";
import { PlayerRoles } from "../constants/playerRoles.js";
import { PlayerVerificationStatuses } from "../constants/playerVerification.js";
import type { Player } from "../types/player.js";

const { Schema } = mongoose;

export type PlayerDocument = mongoose.HydratedDocument<Player>;

const discordProfileSchema = new Schema<Player["discord"]>(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const gameProfileSchema = new Schema<Player["game"]>(
  {
    ign: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 32,
    },

    playerId: {
      type: String,
      required: true,
      trim: true,
    },

    serverId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const ratingSchema = new Schema<Player["rating"]>(
  {
    rsr: {
      type: Number,
      required: true,
      default: PlayerDefaults.initialRating,
      min: 0,
    },

    confidence: {
      type: Number,
      required: true,
      default: PlayerDefaults.initialConfidence,
      min: 0,
      max: 100,
    },
  },
  {
    _id: false,
  },
);

const statisticsSchema = new Schema<Player["statistics"]>(
  {
    wins: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    losses: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    matchesPlayed: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const behaviorSchema = new Schema<Player["behavior"]>(
  {
    score: {
      type: Number,
      required: true,
      default: PlayerDefaults.initialBehaviorScore,
      min: 0,
      max: 100,
    },

    penalties: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    integrityLevel: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 3,
    },

    lastIntegritySanctionAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const queueSchema = new Schema<Player["queue"]>(
  {
    acceptedMatches: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    declinedMatches: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    bannedUntil: {
      type: Date,
      default: null,
    },

    disciplineLevel: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 3,
    },

    lastPenaltyAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const rolePreferencesSchema = new Schema(
  {
    primary: {
      type: String,
      enum: PlayerRoles,
      default: null,
    },

    secondary: {
      type: String,
      enum: PlayerRoles,
      default: null,
    },

    avoided: {
      type: String,
      enum: PlayerRoles,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const verificationSchema = new Schema(
  {
    status: {
      type: String,
      required: true,
      enum: PlayerVerificationStatuses,
      default: "legacy_verified",
    },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedByDiscordId: { type: String, default: null, trim: true },
    rejectionReason: { type: String, default: null, trim: true },
  },
  { _id: false },
);

const preferencesSchema = new Schema(
  {
    roles: {
      type: rolePreferencesSchema,
      required: true,
      default: () => ({}),
    },
  },
  {
    _id: false,
  },
);

const playerSchema = new Schema<Player>(
  {
    discord: {
      type: discordProfileSchema,
      required: true,
    },

    game: {
      type: gameProfileSchema,
      required: true,
    },

    rating: {
      type: ratingSchema,
      required: true,
      default: () => ({}),
    },

    statistics: {
      type: statisticsSchema,
      required: true,
      default: () => ({}),
    },

    behavior: {
      type: behaviorSchema,
      required: true,
      default: () => ({}),
    },

    queue: {
      type: queueSchema,
      required: true,
      default: () => ({}),
    },

    verification: {
      type: verificationSchema,
      required: true,
      default: () => ({ status: "legacy_verified" }),
    },

    preferences: {
      type: preferencesSchema,
      required: true,
      default: () => ({}),
    },
  },
  {
    collection: "players",
    timestamps: true,
    versionKey: false,
  },
);

playerSchema.index(
  {
    "discord.id": 1,
  },
  {
    name: "unique_discord_id",
    unique: true,
  },
);

playerSchema.index(
  {
    "game.playerId": 1,
    "game.serverId": 1,
  },
  {
    name: "unique_mlbb_account",
    unique: true,
  },
);

playerSchema.index(
  {
    "rating.rsr": -1,
  },
  {
    name: "rating_leaderboard",
  },
);

export const PlayerModel: mongoose.Model<Player> =
  mongoose.models.Player ?? mongoose.model<Player>("Player", playerSchema);
