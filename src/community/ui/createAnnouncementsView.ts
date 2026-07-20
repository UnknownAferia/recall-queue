import type { ContainerBuilder } from "discord.js";

import { ViewFactory } from "../../ui/ViewFactory.js";

export function createAnnouncementsView(): ContainerBuilder {
  return ViewFactory.createContainer(0x3498db)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Official Updates",
        "Vora Announcements",
        "Platform news, matchmaking changes, maintenance notices and season updates are published here.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### What appears in this channel",
          "- Major Vora releases and feature changes",
          "- Scheduled maintenance and service incidents",
          "- Matchmaking, rating and rule updates",
          "- Community events and future season announcements",
          "",
          "Official operational status is always available in `matchmaking-status`. Questions belong in `help` or a private ticket, so this channel can remain a clean announcement archive.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer("Only announcements from Vora staff are official."),
    );
}
