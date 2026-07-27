import {
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  type ContainerBuilder,
} from "discord.js";

import { BrandColors } from "../../config/brand.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export function createLaunchAnnouncementView(
  bannerAttachmentName?: string,
): ContainerBuilder {
  const view = ViewFactory.createContainer(BrandColors.voraCyan);

  if (bannerAttachmentName) {
    view.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://${bannerAttachmentName}`)
          .setDescription(
            "Vora — officially released. Find your five and play as one.",
          ),
      ),
    );
  }

  return view
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Official Release",
        "Vora Is Live",
        "Vora is now officially available: a complete Discord-first platform for forming compatible five-player Mobile Legends squads.",
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
          "- Ranked Skill Rating (RSR), placements and confidence",
          "- Bronze-to-Apex divisions with cosmetic Discord roles",
          "- Seasonal leaderboards, soft resets, history and achievements",
          "",
          "### Community operations",
          "- Live leaderboard and matchmaking-status panels",
          "- Voluntary Squad Alerts and planned community queue sessions",
          "- Guided registration, private onboarding reminders and verification worklists",
          "- Private support tickets with transcripts and retention controls",
          "- Reports, moderation cases, audit history and appeals",
          "- Production hosting, automated health monitoring, backups and recovery checks",
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "## Start playing with Vora",
          "**1.** Read the rules and `how-vora-works`.",
          "**2.** Open `register` and click **Register & Submit**.",
          "**3.** After approval, open `/vora` and configure your preferred roles.",
          "**4.** Check `matchmaking-status`, join `queue-lobby` and enter the teammate pool.",
          "**5.** Accept your ready check and queue in Mobile Legends with the completed squad.",
          "",
          "> Vora is live at **voramlbb.com** and will continue improving through real matches, honest feedback and responsible competition.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer("Find your five. Queue together. Play as one."),
    );
}
