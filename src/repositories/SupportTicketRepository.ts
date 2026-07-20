import {
  SupportTicketModel,
  type SupportTicketDocument,
} from "../models/SupportTicketModel.js";

export interface CreateSupportTicketInput {
  readonly guildId: string;
  readonly channelId: string;
  readonly requesterDiscordId: string;
  readonly subject: string;
  readonly description: string;
}

export class SupportTicketRepository {
  public async findOpenByRequester(
    guildId: string,
    requesterDiscordId: string,
  ): Promise<SupportTicketDocument | null> {
    return SupportTicketModel.findOne({
      guildId,
      requesterDiscordId,
      status: "open",
    }).exec();
  }

  public async findOpenByChannel(
    guildId: string,
    channelId: string,
  ): Promise<SupportTicketDocument | null> {
    return SupportTicketModel.findOne({
      guildId,
      channelId,
      status: "open",
    }).exec();
  }

  public async create(
    input: CreateSupportTicketInput,
  ): Promise<SupportTicketDocument> {
    return SupportTicketModel.create({
      ...input,
      status: "open",
      closedByDiscordId: null,
      closedAt: null,
    });
  }

  public async close(
    ticketId: string,
    closedByDiscordId: string,
  ): Promise<SupportTicketDocument | null> {
    return SupportTicketModel.findOneAndUpdate(
      { _id: ticketId, status: "open" },
      {
        $set: {
          status: "closed",
          closedByDiscordId,
          closedAt: new Date(),
        },
      },
      { returnDocument: "after", runValidators: true },
    ).exec();
  }

  public async closeOrphan(ticketId: string): Promise<void> {
    await SupportTicketModel.updateOne(
      { _id: ticketId, status: "open" },
      {
        $set: {
          status: "closed",
          closedByDiscordId: null,
          closedAt: new Date(),
        },
      },
      { runValidators: true },
    ).exec();
  }
}
