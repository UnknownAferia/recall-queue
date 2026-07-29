import mongoose from "mongoose";

import {
  CommunitySquadFoundingStatuses,
  CommunitySquadRegions,
} from "../constants/communitySquad.js";
import { PlayerRoles } from "../constants/playerRoles.js";
import type { CommunitySquad } from "../types/communitySquad.js";

const { Schema } = mongoose;

export type CommunitySquadDocument =
  mongoose.HydratedDocument<CommunitySquad>;

const memberSchema = new Schema(
  {
    discordId: { type: String, required: true, trim: true },
    joinedAt: { type: Date, required: true },
  },
  { _id: false },
);

const foundingSchema = new Schema(
  {
    status: {
      type: String,
      required: true,
      enum: CommunitySquadFoundingStatuses,
      default: "none",
    },
    appliedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedByDiscordId: { type: String, default: null, trim: true },
    rejectionReason: { type: String, default: null, trim: true },
  },
  { _id: false },
);

const communitySquadSchema = new Schema<CommunitySquad>(
  {
    guildId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    tag: { type: String, required: true, trim: true, maxlength: 5 },
    description: { type: String, default: null, trim: true, maxlength: 240 },
    region: {
      type: String,
      required: true,
      enum: CommunitySquadRegions,
    },
    inviteCode: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      maxlength: 8,
    },
    captainDiscordId: { type: String, required: true, trim: true },
    members: {
      type: [memberSchema],
      required: true,
      validate: {
        validator: (members: CommunitySquad["members"]) =>
          members.length >= 1 && members.length <= 15,
        message: "A community squad must contain between 1 and 15 members.",
      },
    },
    recruitingRoles: {
      type: [{ type: String, enum: PlayerRoles }],
      required: true,
      default: () => [],
    },
    founding: {
      type: foundingSchema,
      required: true,
      default: () => ({}),
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "archived"],
      default: "active",
    },
    archivedAt: { type: Date, default: null },
  },
  {
    collection: "community_squads",
    timestamps: true,
    versionKey: false,
  },
);

communitySquadSchema.index(
  { guildId: 1, normalizedName: 1 },
  {
    name: "unique_active_community_squad_name",
    unique: true,
    partialFilterExpression: { status: "active" },
  },
);
communitySquadSchema.index(
  { guildId: 1, inviteCode: 1 },
  {
    name: "unique_active_community_squad_invite",
    unique: true,
    partialFilterExpression: { status: "active" },
  },
);
communitySquadSchema.index(
  { guildId: 1, "members.discordId": 1 },
  {
    name: "unique_active_community_squad_membership",
    unique: true,
    partialFilterExpression: { status: "active" },
  },
);
communitySquadSchema.index(
  { guildId: 1, "founding.status": 1, createdAt: 1 },
  { name: "community_squad_founding_review" },
);

export const CommunitySquadModel: mongoose.Model<CommunitySquad> =
  mongoose.models.CommunitySquad ??
  mongoose.model<CommunitySquad>("CommunitySquad", communitySquadSchema);
