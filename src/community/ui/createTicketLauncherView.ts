import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import { CommunityCustomIds } from "../../constants/community.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export function createTicketLauncherView(): ContainerBuilder {
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.ticket.open)
      .setLabel("Open Ticket")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Success),
  );

  return ViewFactory.createContainer(0x57f287)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Private Support",
        "Open a Ticket",
        "Create a private channel shared only with you and the Vora staff team.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "Use a ticket for account problems, sanctions, disputed results or sensitive reports.",
          "",
          "- Describe the issue clearly.",
          "- Include the relevant squad reference when available.",
          "- Do not open multiple tickets for the same issue.",
          "- Never submit passwords or authentication codes.",
        ].join("\n"),
      ),
    )
    .addActionRowComponents(actions)
    .addTextDisplayComponents(
      ViewFactory.footer("One open ticket per member and server."),
    );
}
