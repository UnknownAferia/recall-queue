import type { ContainerBuilder } from "discord.js";

import { ViewFactory } from "../../ui/ViewFactory.js";

export function createVoraCommandsView(
  iconAttachmentName?: string,
): ContainerBuilder {
  const view = ViewFactory.createContainer(0x57f287);

  ViewFactory.addHeading(
    view,
    "Vora Core",
    "Competitive Hub",
    "Use this channel for Vora commands and private interaction menus.",
    iconAttachmentName,
    "Vora commands",
  );

  return view
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Player commands",
          "`/register` — Connect your Mobile Legends account to Vora.",
          "`/vora` — Open the main hub for queueing, preferences, history and leaderboard access.",
          "`/profile` — Open your competitive player profile directly.",
          "",
          "### Privacy",
          "Vora's menus and confirmations are normally ephemeral, meaning only you can see them. Public squad information is shown only when required for the active workflow.",
          "",
          "> If a command is unavailable, check `matchmaking-status` first and then use the support channels.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer("Start with /register, then continue through /vora."),
    );
}
