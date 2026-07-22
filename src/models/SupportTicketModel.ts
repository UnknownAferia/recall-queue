import mongoose from "mongoose";

import type { SupportTicket } from "../types/community.js";

const { Schema } = mongoose;

export type SupportTicketDocument = mongoose.HydratedDocument<SupportTicket>;

const supportTicketSchema = new Schema<SupportTicket>(
  {
    guildId: { type: String, required: true, trim: true },
    channelId: { type: String, required: true, trim: true },
    requesterDiscordId: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true, maxlength: 80 },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1_000,
    },
    relatedModerationCaseNumber: {
      type: Number,
      default: null,
      min: 1,
    },
    status: {
      type: String,
      required: true,
      enum: ["open", "closed"],
      default: "open",
    },
    closedByDiscordId: { type: String, default: null, trim: true },
    closedAt: { type: Date, default: null },
    transcriptChannelId: { type: String, default: null, trim: true },
    transcriptMessageId: { type: String, default: null, trim: true },
    transcriptMessageCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    transcriptArchivedAt: { type: Date, default: null },
    channelDeleteAfter: { type: Date, default: null },
    channelDeletedAt: { type: Date, default: null },
    transcriptDeleteAfter: { type: Date, default: null },
  },
  {
    collection: "support_tickets",
    timestamps: true,
    versionKey: false,
  },
);

supportTicketSchema.index(
  { guildId: 1, requesterDiscordId: 1 },
  {
    name: "unique_open_ticket_per_requester",
    unique: true,
    partialFilterExpression: { status: "open" },
  },
);
supportTicketSchema.index(
  { guildId: 1, status: 1, transcriptArchivedAt: 1, closedAt: 1 },
  { name: "ticket_transcript_recovery" },
);
supportTicketSchema.index(
  { guildId: 1, channelDeleteAfter: 1, channelDeletedAt: 1 },
  { name: "ticket_channel_retention" },
);
supportTicketSchema.index(
  { transcriptDeleteAfter: 1 },
  { name: "ticket_transcript_retention" },
);
supportTicketSchema.index(
  { guildId: 1, channelId: 1, status: 1 },
  { name: "open_ticket_channel" },
);

export const SupportTicketModel: mongoose.Model<SupportTicket> =
  mongoose.models.SupportTicket ??
  mongoose.model<SupportTicket>("SupportTicket", supportTicketSchema);
