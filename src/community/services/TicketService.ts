import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type TextChannel,
} from "discord.js";

import { logger } from "../../config/logger.js";
import { CommunityConfig } from "../../constants/community.js";
import {
  GuildBlueprint,
  type GuildRoleKey,
} from "../../config/guildBlueprint.js";
import type { SupportTicketDocument } from "../../models/SupportTicketModel.js";
import type { SupportTicketRepository } from "../../repositories/SupportTicketRepository.js";
import { OperationalAuditService } from "../../services/OperationalAuditService.js";
import { formatError } from "../../utils/formatError.js";
import { createOpenTicketView } from "../ui/createOpenTicketView.js";
import { TicketAlreadyOpenError } from "../errors/TicketAlreadyOpenError.js";
import { TicketOperationError } from "../errors/TicketOperationError.js";
import type { ManagedCommunityChannelResolver } from "./ManagedCommunityChannelResolver.js";
import { FixedWindowRateLimiter } from "./FixedWindowRateLimiter.js";
import { TicketTranscriptService } from "./TicketTranscriptService.js";

export interface OpenTicketResult {
  readonly ticket: SupportTicketDocument;
  readonly channel: TextChannel;
}

const StaffRoleKeys = new Set<GuildRoleKey>([
  "administrator",
  "moderator",
  "developer",
]);

export class TicketService {
  public constructor(
    private readonly repository: SupportTicketRepository,
    private readonly channels: ManagedCommunityChannelResolver,
    private readonly rateLimiter = new FixedWindowRateLimiter(),
    private readonly audit = new OperationalAuditService(),
    private readonly transcripts = new TicketTranscriptService(channels),
    private readonly dependencyTimeoutMs = CommunityConfig.ticketDependencyTimeoutMs,
  ) {}

  public async open(
    guild: Guild,
    requester: GuildMember,
    subjectInput: string,
    descriptionInput: string,
  ): Promise<OpenTicketResult> {
    const rateLimit = this.rateLimiter.consume(
      `ticket:create:${guild.id}:${requester.id}`,
      CommunityConfig.ticketCreateLimit,
      CommunityConfig.ticketCreateWindowMs,
    );

    if (!rateLimit.allowed) {
      void this.audit.record({
        eventType: "ticket_rate_limited",
        guildId: guild.id,
        actorDiscordId: requester.id,
        subjectType: "community_service",
        subjectId: "ticket-create",
        details: { retryAfterMs: rateLimit.retryAfterMs },
      });
      throw new TicketOperationError(
        `Too many ticket attempts. Try again in ${Math.ceil(rateLimit.retryAfterMs / 60_000)} minute(s).`,
      );
    }

    const subject = subjectInput.trim().replace(/\s+/g, " ");
    const description = descriptionInput.trim();
    const relatedModerationCaseNumber = this.extractCaseNumber(
      `${subject}\n${description}`,
    );

    if (subject.length < 3 || subject.length > 80) {
      throw new TicketOperationError(
        "The ticket subject must contain between 3 and 80 characters.",
      );
    }

    if (description.length < 10 || description.length > 1_000) {
      throw new TicketOperationError(
        "The ticket description must contain between 10 and 1,000 characters.",
      );
    }

    logger.info(
      `Ticket creation started for ${requester.id} in guild ${guild.id}.`,
    );

    const existing = await this.waitForDependency(
      this.repository.findOpenByRequester(guild.id, requester.id),
      "checking existing support tickets",
    );

    if (existing) {
      const existingChannel = await this.waitForDependency(
        guild.channels
          .fetch(existing.channelId, { force: true })
          .catch(() => null),
        "checking the existing support channel",
      );

      if (existingChannel) {
        throw new TicketAlreadyOpenError(existing.channelId);
      }

      await this.repository.closeOrphan(existing.id);
    }

    const categoryId = await this.waitForDependency(
      this.channels.resolveCategoryId(guild, "support"),
      "resolving the support category",
    );

    if (!categoryId || !guild.members.me) {
      throw new TicketOperationError(
        "The managed support category is unavailable. Ask the server owner to run /server-setup.",
      );
    }

    const staffRoleIds = GuildBlueprint.roles
      .filter((role) => StaffRoleKeys.has(role.key))
      .map((role) =>
        guild.roles.cache.find((candidate) => candidate.name === role.name),
      )
      .filter((role): role is NonNullable<typeof role> => Boolean(role))
      .map((role) => role.id);
    const channel = await guild.channels.create({
      name: this.createChannelName(requester.displayName),
      type: ChannelType.GuildText,
      parent: categoryId,
      topic: `Private Vora support ticket for ${requester.user.tag}`,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: requester.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
        {
          id: guild.members.me.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages,
          ],
        },
        ...staffRoleIds.map((roleId) => ({
          id: roleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ManageMessages,
          ],
        })),
      ],
      reason: `Vora support ticket opened by ${requester.user.tag}`,
    });
    logger.info(
      `Created support channel ${channel.id} for ${requester.id} in guild ${guild.id}.`,
    );

    let createdTicket: SupportTicketDocument | null = null;

    try {
      createdTicket = await this.repository.create({
        guildId: guild.id,
        channelId: channel.id,
        requesterDiscordId: requester.id,
        subject,
        description,
        relatedModerationCaseNumber,
      });
      logger.info(
        `Stored support ticket ${createdTicket.id} for channel ${channel.id}.`,
      );

      await channel.send({
        components: [createOpenTicketView(createdTicket)],
        flags: MessageFlags.IsComponentsV2,
      });

      void this.audit.record({
        eventType: "ticket_opened",
        guildId: guild.id,
        actorDiscordId: requester.id,
        subjectType: "support_ticket",
        subjectId: createdTicket.id,
        details: { channelId: channel.id, subject },
      });
      logger.info(
        `Support ticket ${createdTicket.id} opened successfully in guild ${guild.id}.`,
      );

      return { ticket: createdTicket, channel };
    } catch (error: unknown) {
      if (createdTicket) {
        await this.repository.closeOrphan(createdTicket.id);
      }

      await channel
        .delete("Ticket creation failed; cleaning up channel")
        .catch(() => undefined);

      const winner = await this.repository.findOpenByRequester(
        guild.id,
        requester.id,
      );

      if (winner) {
        throw new TicketAlreadyOpenError(winner.channelId);
      }

      throw error;
    }
  }

  public async close(
    guild: Guild,
    channel: TextChannel,
    member: GuildMember,
  ): Promise<SupportTicketDocument> {
    const rateLimit = this.rateLimiter.consume(
      `ticket:close:${guild.id}:${member.id}`,
      CommunityConfig.ticketCloseLimit,
      CommunityConfig.ticketCloseWindowMs,
    );

    if (!rateLimit.allowed) {
      void this.audit.record({
        eventType: "ticket_rate_limited",
        guildId: guild.id,
        actorDiscordId: member.id,
        subjectType: "community_service",
        subjectId: "ticket-close",
        details: { retryAfterMs: rateLimit.retryAfterMs },
      });
      throw new TicketOperationError(
        `Too many ticket actions. Try again in ${Math.ceil(rateLimit.retryAfterMs / 60_000)} minute(s).`,
      );
    }

    const ticket = await this.repository.findOpenByChannel(
      guild.id,
      channel.id,
    );

    if (!ticket) {
      throw new TicketOperationError("This ticket is already closed.");
    }

    const canClose =
      ticket.requesterDiscordId === member.id ||
      member.permissions.has(PermissionFlagsBits.ManageMessages);

    if (!canClose) {
      throw new TicketOperationError(
        "Only the ticket requester or Vora staff can close this ticket.",
      );
    }

    const closedAt = new Date();
    const closed = await this.repository.close(
      ticket.id,
      member.id,
      closedAt,
      new Date(
        closedAt.getTime() + CommunityConfig.ticketClosedChannelRetentionMs,
      ),
      new Date(
        closedAt.getTime() + CommunityConfig.ticketTranscriptRetentionMs,
      ),
    );

    if (!closed) {
      throw new TicketOperationError("This ticket is already closed.");
    }

    await channel.permissionOverwrites.edit(ticket.requesterDiscordId, {
      SendMessages: false,
      AttachFiles: false,
    });

    if (!channel.name.startsWith("closed-")) {
      await channel.setName(`closed-${channel.name}`.slice(0, 100));
    }

    void this.audit.record({
      eventType: "ticket_closed",
      guildId: guild.id,
      actorDiscordId: member.id,
      subjectType: "support_ticket",
      subjectId: closed.id,
      details: { channelId: channel.id },
    });
    void this.archiveTicket(guild, channel, closed);

    return closed;
  }

  public async runRetention(guild: Guild, now = new Date()): Promise<void> {
    const missingTranscripts =
      await this.repository.findClosedWithoutTranscript(guild.id, 25);

    for (const ticket of missingTranscripts) {
      await this.runRetentionOperation(
        guild,
        ticket,
        "transcript_recovery",
        async () => {
          const channel = await guild.channels
            .fetch(ticket.channelId, { force: true })
            .catch(() => null);

          if (channel?.type === ChannelType.GuildText) {
            await this.archiveTicket(guild, channel, ticket);
          } else {
            await this.repository.markChannelDeleted(ticket.id, now);
            await this.repository.scheduleRecordPurge(
              ticket.id,
              new Date(
                now.getTime() + CommunityConfig.ticketTranscriptRetentionMs,
              ),
            );
          }
        },
      );
    }

    const channelsDue = await this.repository.findChannelsDueForDeletion(
      guild.id,
      now,
      25,
    );

    for (const ticket of channelsDue) {
      await this.runRetentionOperation(
        guild,
        ticket,
        "channel_deletion",
        async () => {
          const channel = await guild.channels
            .fetch(ticket.channelId, { force: true })
            .catch(() => null);

          if (channel) {
            await channel.delete(
              "Vora support ticket retention period elapsed",
            );
          }

          await this.repository.markChannelDeleted(ticket.id, now);
          await this.audit.record({
            eventType: "ticket_channel_deleted",
            guildId: guild.id,
            actorDiscordId: null,
            subjectType: "support_ticket",
            subjectId: ticket.id,
            details: { channelId: ticket.channelId },
          });
        },
      );
    }

    const transcriptsDue = await this.repository.findTranscriptsDueForDeletion(
      guild.id,
      now,
      25,
    );

    for (const ticket of transcriptsDue) {
      await this.runRetentionOperation(
        guild,
        ticket,
        "transcript_deletion",
        async () => {
          await this.deleteTranscriptMessage(guild, ticket);

          if (await this.repository.deleteRecord(ticket.id)) {
            await this.audit.record({
              eventType: "ticket_record_purged",
              guildId: guild.id,
              actorDiscordId: null,
              subjectType: "support_ticket",
              subjectId: ticket.id,
              details: { retentionDays: 365 },
            });
          }
        },
      );
    }
  }

  private async runRetentionOperation(
    guild: Guild,
    ticket: SupportTicketDocument,
    operation: string,
    action: () => Promise<void>,
  ): Promise<void> {
    try {
      await action();
    } catch (error: unknown) {
      logger.error(
        `Ticket retention operation ${operation} failed for ${ticket.id}:\n${formatError(error)}`,
      );
      await this.audit.record({
        eventType: "ticket_operation_failed",
        guildId: guild.id,
        actorDiscordId: null,
        subjectType: "support_ticket",
        subjectId: ticket.id,
        details: { operation },
      });
    }
  }

  private async waitForDependency<T>(
    operation: Promise<T>,
    description: string,
  ): Promise<T> {
    let timeout: NodeJS.Timeout | null = null;

    try {
      return await Promise.race([
        operation,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => {
            reject(
              new TicketOperationError(
                `Vora timed out while ${description}. Please try again.`,
              ),
            );
          }, this.dependencyTimeoutMs);
          timeout.unref();
        }),
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private async archiveTicket(
    guild: Guild,
    channel: TextChannel,
    ticket: SupportTicketDocument,
  ): Promise<void> {
    if (ticket.transcriptArchivedAt) {
      return;
    }

    try {
      const reference = await this.transcripts.archive(guild, channel, ticket);
      const retentionStartsAt =
        ticket.closedAt ?? reference.transcriptArchivedAt;
      const stored = await this.repository.storeTranscript(
        ticket.id,
        reference,
        ticket.channelDeleteAfter ??
          new Date(
            retentionStartsAt.getTime() +
              CommunityConfig.ticketClosedChannelRetentionMs,
          ),
        ticket.transcriptDeleteAfter ??
          new Date(
            retentionStartsAt.getTime() +
              CommunityConfig.ticketTranscriptRetentionMs,
          ),
      );

      if (stored) {
        await this.audit.record({
          eventType: "ticket_transcript_archived",
          guildId: guild.id,
          actorDiscordId: null,
          subjectType: "support_ticket",
          subjectId: ticket.id,
          details: {
            archiveChannelId: reference.transcriptChannelId,
            archiveMessageId: reference.transcriptMessageId,
            messageCount: reference.transcriptMessageCount,
          },
        });
      }
    } catch (error: unknown) {
      logger.error(
        `Ticket transcript archive failed for ${ticket.id}:\n${formatError(error)}`,
      );
      await this.audit.record({
        eventType: "ticket_operation_failed",
        guildId: guild.id,
        actorDiscordId: null,
        subjectType: "support_ticket",
        subjectId: ticket.id,
        details: { operation: "transcript_archive" },
      });
    }
  }

  private async deleteTranscriptMessage(
    guild: Guild,
    ticket: SupportTicketDocument,
  ): Promise<void> {
    if (!ticket.transcriptChannelId || !ticket.transcriptMessageId) {
      return;
    }

    const channel = await guild.channels
      .fetch(ticket.transcriptChannelId, { force: true })
      .catch(() => null);

    if (channel?.type !== ChannelType.GuildText) {
      return;
    }

    const message = await channel.messages
      .fetch(ticket.transcriptMessageId)
      .catch(() => null);

    if (message) {
      await message.delete();
    }
  }

  private createChannelName(displayName: string): string {
    const normalized = displayName
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70);

    return `ticket-${normalized || "player"}`;
  }

  private extractCaseNumber(content: string): number | null {
    const match = content.match(/\bVORA-(\d{1,6})\b/i);
    return match ? Number(match[1]) : null;
  }
}
