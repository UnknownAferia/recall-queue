import {
  AttachmentBuilder,
  type Guild,
  type Message,
  type TextChannel,
} from "discord.js";

import { CommunityConfig } from "../../constants/community.js";
import type { SupportTicketDocument } from "../../models/SupportTicketModel.js";
import type { SupportTicketTranscriptReference } from "../../repositories/SupportTicketRepository.js";
import type { ManagedCommunityChannelResolver } from "./ManagedCommunityChannelResolver.js";

export interface TicketTranscriptMessage {
  readonly id: string;
  readonly createdAt: Date;
  readonly authorTag: string;
  readonly authorId: string;
  readonly content: string;
  readonly attachmentUrls: readonly string[];
}

export function serializeTicketTranscript(
  ticket: SupportTicketDocument,
  messages: readonly TicketTranscriptMessage[],
): string {
  const header = [
    "Vora Support Ticket Transcript",
    `Ticket: ${ticket.id}`,
    `Guild: ${ticket.guildId}`,
    `Channel: ${ticket.channelId}`,
    `Requester: ${ticket.requesterDiscordId}`,
    `Subject: ${ticket.subject}`,
    `Opened: ${ticket.createdAt.toISOString()}`,
    `Closed: ${ticket.closedAt?.toISOString() ?? "Not closed"}`,
    "",
    "--- Messages ---",
    "",
  ];
  const body = messages.flatMap((message) => {
    const content = message.content || "[No text content]";
    const attachments = message.attachmentUrls.map(
      (url) => `  Attachment: ${url}`,
    );

    return [
      `[${message.createdAt.toISOString()}] ${message.authorTag} (${message.authorId})`,
      content,
      ...attachments,
      "",
    ];
  });

  return [...header, ...body].join("\n");
}

export class TicketTranscriptService {
  public constructor(
    private readonly channels: ManagedCommunityChannelResolver,
  ) {}

  public async archive(
    guild: Guild,
    channel: TextChannel,
    ticket: SupportTicketDocument,
  ): Promise<SupportTicketTranscriptReference> {
    const archiveChannel = await this.channels.resolveTextChannel(
      guild,
      "voraLog",
    );

    if (!archiveChannel) {
      throw new Error(
        "The managed Vora log channel is unavailable for ticket transcripts.",
      );
    }

    const messages = await this.fetchMessages(channel);
    const transcript = serializeTicketTranscript(ticket, messages);
    const fileName = `vora-ticket-${ticket.id.slice(-8).toLowerCase()}.txt`;
    const archiveMessage = await archiveChannel.send({
      content: [
        "**Support ticket transcript archived**",
        `Ticket: \`${ticket.id}\``,
        `Requester: <@${ticket.requesterDiscordId}>`,
        `Source: <#${ticket.channelId}>`,
        `Messages: **${messages.length}**`,
      ].join("\n"),
      files: [
        new AttachmentBuilder(Buffer.from(transcript, "utf8"), {
          name: fileName,
        }),
      ],
      allowedMentions: { parse: [] },
    });
    const archivedAt = new Date();

    return {
      transcriptChannelId: archiveChannel.id,
      transcriptMessageId: archiveMessage.id,
      transcriptMessageCount: messages.length,
      transcriptArchivedAt: archivedAt,
    };
  }

  private async fetchMessages(
    channel: TextChannel,
  ): Promise<TicketTranscriptMessage[]> {
    const collected: Message[] = [];
    let before: string | undefined;

    while (collected.length < CommunityConfig.ticketTranscriptMaximumMessages) {
      const batch = await channel.messages.fetch({
        limit: Math.min(
          100,
          CommunityConfig.ticketTranscriptMaximumMessages - collected.length,
        ),
        ...(before ? { before } : {}),
      });

      if (batch.size === 0) {
        break;
      }

      collected.push(...batch.values());
      before = batch.last()?.id;

      if (batch.size < 100 || !before) {
        break;
      }
    }

    return collected
      .sort((left, right) => left.createdTimestamp - right.createdTimestamp)
      .map((message) => ({
        id: message.id,
        createdAt: new Date(message.createdTimestamp),
        authorTag: message.author.tag,
        authorId: message.author.id,
        content: message.content,
        attachmentUrls: message.attachments.map((attachment) => attachment.url),
      }));
  }
}
