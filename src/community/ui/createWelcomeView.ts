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
        "Find Your Five. Play as One.",
        "Vora forms compatible five-player Mobile Legends squads around role fit, rating and reliability.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Your path into matchmaking",
          "**1. Register & verify** — Open `register`, click **Register & Submit** and send one current MLBB profile screenshot.",
          "**2. Complete Operations review** — Matchmaking unlocks after your account evidence is approved.",
          "**3. Set your role identity** — Open `/vora` → **Preferences** and select two different preferred roles.",
          "**4. Choose when to play** — Join planned community sessions or enable voluntary **Squad Alerts** in `matchmaking-status`.",
          "**5. Enter the teammate pool** — Join `queue-lobby`, enter through `/vora`, accept the ready check and move into your private squad room.",
          "",
          "### One platform inside Discord",
          "**Vora Core** manages profiles, the teammate pool, squad formation, verified results, RSR and seasons.",
          "**Vora Community** manages onboarding, live status, leaderboards, scheduled sessions, Squad Alerts, support and moderation.",
          "",
          "> Read `rules` and `how-vora-works` before entering your first squad. More information is available at **voramlbb.com**.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Discord-first teammate formation for Mobile Legends: Bang Bang.",
      ),
    );
}
