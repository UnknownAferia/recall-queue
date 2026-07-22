import mongoose from "mongoose";

import {
  PlayerAdministrationActions,
  PlayerAdministrationOperationStatuses,
} from "../constants/playerAdministration.js";
import type { PlayerAdministrationOperation } from "../types/playerAdministration.js";

const { Schema } = mongoose;

export type PlayerAdministrationOperationDocument =
  mongoose.HydratedDocument<PlayerAdministrationOperation>;

const resultSchema = new Schema(
  {
    queuesRemoved: { type: Number, required: true, min: 0 },
    verificationRequestsClosed: { type: Number, required: true, min: 0 },
    playerDeleted: { type: Boolean, required: true },
    managedRolesRemoved: { type: Number, required: true, min: 0, default: 0 },
    evidenceMessagesRemoved: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const snapshotSchema = new Schema(
  {
    playerId: { type: String, required: true, trim: true },
    ign: { type: String, required: true, trim: true },
    gamePlayerId: { type: String, required: true, trim: true },
    gameServerId: { type: String, required: true, trim: true },
    verificationStatus: { type: String, required: true, trim: true },
    matchesPlayed: { type: Number, required: true, min: 0 },
    rsr: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const operationSchema = new Schema<PlayerAdministrationOperation>(
  {
    schemaVersion: { type: Number, required: true, min: 1, default: 1 },
    action: { type: String, required: true, enum: PlayerAdministrationActions },
    status: {
      type: String,
      required: true,
      enum: PlayerAdministrationOperationStatuses,
      default: "pending",
    },
    guildId: { type: String, required: true, trim: true },
    actorDiscordId: { type: String, required: true, trim: true },
    targetDiscordId: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    expiresAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    blockerReasons: { type: [String], required: true, default: [] },
    snapshot: { type: snapshotSchema, default: null },
    result: { type: resultSchema, default: null },
  },
  {
    collection: "player_administration_operations",
    timestamps: true,
    versionKey: false,
  },
);

operationSchema.index(
  { guildId: 1, actorDiscordId: 1, createdAt: -1 },
  { name: "staff_player_administration_history" },
);
operationSchema.index(
  { targetDiscordId: 1, createdAt: -1 },
  { name: "player_administration_audit_history" },
);
operationSchema.index(
  { status: 1, expiresAt: 1 },
  { name: "pending_player_administration_expiration" },
);

export const PlayerAdministrationOperationModel =
  mongoose.models.PlayerAdministrationOperation ??
  mongoose.model<PlayerAdministrationOperation>(
    "PlayerAdministrationOperation",
    operationSchema,
  );
