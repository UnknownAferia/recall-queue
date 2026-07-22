import {
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  type ContainerBuilder,
} from "discord.js";

import { BrandColors } from "../../config/brand.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export function createAlphaLaunchAnnouncementView(
  bannerAttachmentName?: string,
): ContainerBuilder {
  const view = ViewFactory.createContainer(BrandColors.voraCyan);

  if (bannerAttachmentName) {
    view.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://${bannerAttachmentName}`)
          .setDescription(
            "Vora Private Alpha — find your five and play as one.",
          ),
      ),
    );
  }

  return view
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Private Alpha Milestone",
        "Vora Is Ready for Its First Players",
        "The foundation is complete. Vora can now form compatible five-player Mobile Legends squads and support their full competitive journey inside Discord.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "## What we built",
          "### Player experience",
          "- MLBB account registration and persistent player profiles",
          "- Primary, secondary and avoided role preferences",
          "- Behavior, reliability, match history and personal progression",
          "",
          "### Five-player teammate matchmaking",
          "- Skill-, behavior- and role-aware squad formation",
          "- Ready checks, queue cooldowns and voice-lobby validation",
          "- Automatic private squad voice channels and captain flow",
          "",
          "### Competitive integrity",
          "- Screenshot-backed result reporting and squad verification",
          "- Staff dispute review, corrections, sanctions and audit history",
          "- Deadlines for abandoned reports and confirmations",
          "",
          "### Rating and progression",
          "- Recall Skill Rating, placements and confidence",
          "- Bronze-to-Apex divisions with cosmetic Discord roles",
          "- Seasonal leaderboards, soft resets, history and achievements",
          "",
          "### Community operations",
          "- Live leaderboard and matchmaking-status panels",
          "- Private support tickets with transcripts and retention controls",
          "- Automated server setup, permissions, health monitoring and backups",
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "## Join the alpha",
          "**1.** Read the rules and `how-vora-works`.",
          "**2.** Use `/register` to connect your MLBB account.",
          "**3.** Open `/vora` and configure your preferred roles.",
          "**4.** Join `queue-lobby`, enter the teammate pool and accept your ready check.",
          "**5.** Queue in Mobile Legends with your completed squad.",
          "",
          "> Vora is entering a controlled alpha. Real matches, honest feedback and responsible testing will shape every improvement from here.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Find your five. Queue together. Play as one.",
      ),
    );
}
