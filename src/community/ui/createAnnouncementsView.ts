import type { ContainerBuilder } from "discord.js";

import { ViewFactory } from "../../ui/ViewFactory.js";

export function createAnnouncementsView(
  iconAttachmentName?: string,
): ContainerBuilder {
  const view = ViewFactory.createContainer(0x3498db);

  ViewFactory.addHeading(
    view,
    "Official Updates",
    "Vora Announcements",
    "Platform news, matchmaking changes, maintenance notices and season updates are published here.",
    iconAttachmentName,
    "Vora announcements",
  );

  return view
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Published here",
          "- Product releases and important feature changes",
          "- Scheduled maintenance, incidents and recovery notices",
          "- Matchmaking, RSR, season and competitive-integrity updates",
          "- Community queue sessions, events and policy changes",
          "",
          "### Live information",
          "Use `matchmaking-status` for current service health, pool activity, upcoming sessions and voluntary Squad Alerts. Use `leaderboard` for live season and lifetime rankings.",
          "",
          "Questions belong in `help`; account-specific or sensitive matters belong in a private ticket. This channel remains a read-only archive of official Vora updates.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Official website: voramlbb.com · Only Vora staff announcements are authoritative.",
      ),
    );
}
