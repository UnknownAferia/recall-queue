import mongoose from "mongoose";

import { PlayerVerificationStatuses } from "../constants/playerVerification.js";
import type {
  PlayerVerificationEvidence,
  PlayerVerificationRequest,
} from "../types/playerVerification.js";

const { Schema } = mongoose;

export type PlayerVerificationDocument =
  mongoose.HydratedDocument<PlayerVerificationRequest>;

const evidenceSchema = new Schema<PlayerVerificationEvidence>(
  {
    archiveChannelId: { type: String, required: true, trim: true },
    archiveMessageId: { type: String, required: true, trim: true },
    archiveAttachmentId: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    contentType: {
      type: String,
      required: true,
      enum: ["image/png", "image/jpeg", "image/webp"],
    },
    size: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const playerVerificationSchema = new Schema<PlayerVerificationRequest>(
  {
    guildId: { type: String, required: true, trim: true },
    playerDiscordId: { type: String, required: true, trim: true },
    game: {
      ign: { type: String, required: true, trim: true },
      playerId: { type: String, required: true, trim: true },
      serverId: { type: String, required: true, trim: true },
    },
    status: {
      type: String,
      required: true,
      enum: PlayerVerificationStatuses.filter(
        (status) => status !== "legacy_verified",
      ),
      default: "pending",
    },
    evidence: { type: evidenceSchema, required: true },
    submittedAt: { type: Date, required: true },
    reviewedAt: { type: Date, default: null },
    reviewedByDiscordId: { type: String, default: null, trim: true },
    rejectionReason: { type: String, default: null, trim: true },
  },
  {
    collection: "player_verification_requests",
    timestamps: true,
    versionKey: false,
  },
);

playerVerificationSchema.index(
  { playerDiscordId: 1, status: 1 },
  {
    name: "unique_pending_player_verification",
    unique: true,
    partialFilterExpression: { status: "pending" },
  },
);
playerVerificationSchema.index(
  { guildId: 1, submittedAt: -1 },
  { name: "guild_player_verification_history" },
);

export const PlayerVerificationModel: mongoose.Model<PlayerVerificationRequest> =
  mongoose.models.PlayerVerificationRequest ??
  mongoose.model<PlayerVerificationRequest>(
    "PlayerVerificationRequest",
    playerVerificationSchema,
  );
