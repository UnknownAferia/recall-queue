import type { ContainerBuilder } from "discord.js";

import { BrandColors } from "../../config/brand.js";
import type { ScrimListingSummary } from "../../types/scrim.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export function createScrimListingsView(
  listings: readonly ScrimListingSummary[],
): ContainerBuilder {
  const body =
    listings.length === 0
      ? "> No matching teams are looking for a scrim right now."
      : listings
          .map((listing) =>
            [
              `### ${listing.teamName} · ${listing.region.toUpperCase()}`,
              `**Captain:** <@${listing.captainDiscordId}>`,
              `**Available:** ${listing.availability}`,
              listing.notes ? `**Notes:** ${listing.notes}` : null,
              `**Listing:** \`${listing.id}\` · expires <t:${Math.floor(listing.expiresAt.getTime() / 1_000)}:R>`,
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n\n");

  return ViewFactory.createContainer(BrandColors.voraCyan)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Vora Scrims",
        "Opponent Team Finder",
        "Open five-player teams looking for a Mobile Legends custom game.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(ViewFactory.text(body))
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Contact a captain privately. Never share account credentials or payment information.",
      ),
    );
}
