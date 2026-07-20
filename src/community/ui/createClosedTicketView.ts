import type { ContainerBuilder } from "discord.js";

import type { SupportTicketDocument } from "../../models/SupportTicketModel.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export function createClosedTicketView(
  ticket: SupportTicketDocument,
): ContainerBuilder {
  return ViewFactory.createContainer(0x80848e)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Vora Support",
        "Ticket Closed",
        "This support request is now read-only for the requester.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `**Subject:** ${ticket.subject}`,
          `**Opened by:** <@${ticket.requesterDiscordId}>`,
          ticket.closedByDiscordId
            ? `**Closed by:** <@${ticket.closedByDiscordId}>`
            : "**Closed by:** System",
          ticket.closedAt
            ? `**Closed:** <t:${Math.floor(ticket.closedAt.getTime() / 1_000)}:F>`
            : null,
          "",
          "Staff may retain this channel for review or remove it when no longer needed.",
        ]
          .filter((line): line is string => line !== null)
          .join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(`Ticket ${ticket.id.slice(-8).toUpperCase()}`),
    );
}
