import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import { CommunityCustomIds } from "../../constants/community.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export function createTicketLauncherView(
  iconAttachmentName?: string,
): ContainerBuilder {
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.ticket.open)
      .setLabel("Open Ticket")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Success),
  );

  const view = ViewFactory.createContainer(0x57f287);

  ViewFactory.addHeading(
    view,
    "Private Support",
    "Open a Ticket",
    "Create a private support channel shared only with you and Vora Operations.",
    iconAttachmentName,
    "Private Vora support ticket",
  );

  return view
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Use a ticket for",
          "- Registration, verification or account-identity problems",
          "- A stuck queue, squad or result workflow",
          "- Result disputes and missing or incorrect evidence",
          "- Moderation questions, sanctions and appeals",
          "- Sensitive reports that should not appear publicly",
          "",
          "### Help Operations resolve it",
          "- Use a clear subject and explain what happened.",
          "- Include relevant player, verification, squad or `VORA-######` references.",
          "- Keep one open ticket per issue and reply in the created channel.",
          "- Never submit passwords, login codes, bot tokens or unrelated personal data.",
        ].join("\n"),
      ),
    )
    .addActionRowComponents(actions)
    .addTextDisplayComponents(
      ViewFactory.footer(
        "One open ticket per member and server · Closed channels are retained for up to 7 days.",
      ),
    );
}
