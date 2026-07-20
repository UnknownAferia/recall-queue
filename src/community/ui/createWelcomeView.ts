import {
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  type ContainerBuilder,
} from "discord.js";

import { BrandColors } from "../../config/brand.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export function createWelcomeView(
  bannerAttachmentName?: string,
): ContainerBuilder {
  const view = ViewFactory.createContainer(BrandColors.voraCyan);

  if (bannerAttachmentName) {
    view.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://${bannerAttachmentName}`)
          .setDescription(
            "Vora — Built for Better Teams. Competitive five-player teammate matchmaking.",
          ),
      ),
    );
  }

  return view
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Welcome to Vora",
        "Find Better Teammates",
        "Vora forms compatible five-player Mobile Legends squads that queue together against external opponents.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Start in four steps",
          "**1. Register** — Use `/register` to connect your MLBB account.",
          "**2. Set your roles** — Open `/vora`, choose Preferences and select a primary and secondary role.",
          "**3. Enter the lobby** — Join the `queue-lobby` voice channel and enter the teammate pool from `/vora`.",
          "**4. Play together** — Accept the ready check, join your private squad voice channel and queue together in MLBB.",
          "",
          "### Two bots, one platform",
          "**Vora Core** manages profiles, matchmaking, squads, results and ratings.",
          "**Vora Community** maintains public information, service status, leaderboards and private support.",
          "",
          "> Continue with the rules and the How Vora Works guide before joining your first queue.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Community teammate formation for Mobile Legends: Bang Bang.",
      ),
    );
}
