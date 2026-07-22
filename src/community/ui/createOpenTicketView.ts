import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import { CommunityCustomIds } from "../../constants/community.js";
import type { SupportTicketDocument } from "../../models/SupportTicketModel.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export function createOpenTicketView(
  ticket: SupportTicketDocument,
): ContainerBuilder {
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.ticket.close)
      .setLabel("Close Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger),
  );

  return ViewFactory.createContainer(0x57f287)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Vora Support",
        ticket.subject,
        `Private ticket opened by <@${ticket.requesterDiscordId}>.`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Request",
          ticket.description,
          ticket.relatedModerationCaseNumber
            ? `**Appeal case:** VORA-${ticket.relatedModerationCaseNumber.toString().padStart(6, "0")}`
            : null,
          "",
          "A staff member can respond directly in this channel.",
          "-# Close the ticket when the issue has been resolved.",
        ].filter((line): line is string => line !== null).join("\n"),
      ),
    )
    .addActionRowComponents(actions)
    .addTextDisplayComponents(
      ViewFactory.footer(`Ticket ${ticket.id.slice(-8).toUpperCase()}`),
    );
}
