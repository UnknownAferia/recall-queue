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
    status: {
      type: String,
      required: true,
      enum: ["open", "closed"],
      default: "open",
    },
    closedByDiscordId: { type: String, default: null, trim: true },
    closedAt: { type: Date, default: null },
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
  { guildId: 1, channelId: 1, status: 1 },
  { name: "open_ticket_channel" },
);

export const SupportTicketModel: mongoose.Model<SupportTicket> =
  mongoose.models.SupportTicket ??
  mongoose.model<SupportTicket>("SupportTicket", supportTicketSchema);
