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
  readonly relatedModerationCaseNumber?: number | null;
}

export interface SupportTicketTranscriptReference {
  readonly transcriptChannelId: string;
  readonly transcriptMessageId: string;
  readonly transcriptMessageCount: number;
  readonly transcriptArchivedAt: Date;
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
      relatedModerationCaseNumber:
        input.relatedModerationCaseNumber ?? null,
      closedByDiscordId: null,
      closedAt: null,
      transcriptChannelId: null,
      transcriptMessageId: null,
      transcriptMessageCount: 0,
      transcriptArchivedAt: null,
      channelDeleteAfter: null,
      channelDeletedAt: null,
      transcriptDeleteAfter: null,
    });
  }

  public async close(
    ticketId: string,
    closedByDiscordId: string,
    closedAt: Date,
    channelDeleteAfter: Date,
    transcriptDeleteAfter: Date,
  ): Promise<SupportTicketDocument | null> {
    return SupportTicketModel.findOneAndUpdate(
      { _id: ticketId, status: "open" },
      {
        $set: {
          status: "closed",
          closedByDiscordId,
          closedAt,
          channelDeleteAfter,
          transcriptDeleteAfter,
        },
      },
      { returnDocument: "after", runValidators: true },
    ).exec();
  }

  public async closeOrphan(ticketId: string): Promise<void> {
    await SupportTicketModel.deleteOne({
      _id: ticketId,
      status: "open",
    }).exec();
  }

  public async storeTranscript(
    ticketId: string,
    reference: SupportTicketTranscriptReference,
    channelDeleteAfter: Date,
    transcriptDeleteAfter: Date,
  ): Promise<SupportTicketDocument | null> {
    return SupportTicketModel.findOneAndUpdate(
      { _id: ticketId, transcriptArchivedAt: null },
      {
        $set: {
          ...reference,
          channelDeleteAfter,
          transcriptDeleteAfter,
        },
      },
      { returnDocument: "after", runValidators: true },
    ).exec();
  }

  public async findClosedWithoutTranscript(
    guildId: string,
    limit: number,
  ): Promise<SupportTicketDocument[]> {
    return SupportTicketModel.find({
      guildId,
      status: "closed",
      transcriptArchivedAt: null,
      channelDeletedAt: null,
    })
      .sort({ closedAt: 1 })
      .limit(limit)
      .exec();
  }

  public async findChannelsDueForDeletion(
    guildId: string,
    now: Date,
    limit: number,
  ): Promise<SupportTicketDocument[]> {
    return SupportTicketModel.find({
      guildId,
      status: "closed",
      transcriptArchivedAt: { $ne: null },
      channelDeleteAfter: { $lte: now },
      channelDeletedAt: null,
    })
      .sort({ channelDeleteAfter: 1 })
      .limit(limit)
      .exec();
  }

  public async markChannelDeleted(
    ticketId: string,
    deletedAt: Date,
  ): Promise<void> {
    await SupportTicketModel.updateOne(
      { _id: ticketId, channelDeletedAt: null },
      { $set: { channelDeletedAt: deletedAt } },
      { runValidators: true },
    ).exec();
  }

  public async scheduleRecordPurge(
    ticketId: string,
    transcriptDeleteAfter: Date,
  ): Promise<void> {
    await SupportTicketModel.updateOne(
      { _id: ticketId, status: "closed" },
      { $set: { transcriptDeleteAfter } },
      { runValidators: true },
    ).exec();
  }

  public async findTranscriptsDueForDeletion(
    guildId: string,
    now: Date,
    limit: number,
  ): Promise<SupportTicketDocument[]> {
    return SupportTicketModel.find({
      guildId,
      status: "closed",
      transcriptDeleteAfter: { $lte: now },
    })
      .sort({ transcriptDeleteAfter: 1 })
      .limit(limit)
      .exec();
  }

  public async deleteRecord(ticketId: string): Promise<boolean> {
    const result = await SupportTicketModel.deleteOne({
      _id: ticketId,
      status: "closed",
    }).exec();

    return result.deletedCount === 1;
  }
}
