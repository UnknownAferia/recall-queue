import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type TextChannel,
} from "discord.js";

import {
  GuildBlueprint,
  type GuildRoleKey,
} from "../../config/guildBlueprint.js";
import type { SupportTicketDocument } from "../../models/SupportTicketModel.js";
import type { SupportTicketRepository } from "../../repositories/SupportTicketRepository.js";
import { createOpenTicketView } from "../ui/createOpenTicketView.js";
import { TicketAlreadyOpenError } from "../errors/TicketAlreadyOpenError.js";
import { TicketOperationError } from "../errors/TicketOperationError.js";
import type { ManagedCommunityChannelResolver } from "./ManagedCommunityChannelResolver.js";

export interface OpenTicketResult {
  readonly ticket: SupportTicketDocument;
  readonly channel: TextChannel;
}

const StaffRoleKeys = new Set<GuildRoleKey>([
  "administrator",
  "moderator",
  "support",
  "developer",
]);

export class TicketService {
  public constructor(
    private readonly repository: SupportTicketRepository,
    private readonly channels: ManagedCommunityChannelResolver,
  ) {}

  public async open(
    guild: Guild,
    requester: GuildMember,
    subjectInput: string,
    descriptionInput: string,
  ): Promise<OpenTicketResult> {
    const subject = subjectInput.trim().replace(/\s+/g, " ");
    const description = descriptionInput.trim();

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

    const existing = await this.repository.findOpenByRequester(
      guild.id,
      requester.id,
    );

    if (existing) {
      const existingChannel = await guild.channels
        .fetch(existing.channelId)
        .catch(() => null);

      if (existingChannel) {
        throw new TicketAlreadyOpenError(existing.channelId);
      }

      await this.repository.closeOrphan(existing.id);
    }

    const categoryId = await this.channels.resolveCategoryId(guild, "support");

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

    let createdTicket: SupportTicketDocument | null = null;

    try {
      createdTicket = await this.repository.create({
        guildId: guild.id,
        channelId: channel.id,
        requesterDiscordId: requester.id,
        subject,
        description,
      });

      await channel.send({
        components: [createOpenTicketView(createdTicket)],
        flags: MessageFlags.IsComponentsV2,
      });

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

    const closed = await this.repository.close(ticket.id, member.id);

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

    return closed;
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
}
