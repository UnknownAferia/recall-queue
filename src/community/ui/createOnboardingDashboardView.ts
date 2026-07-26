import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import { BrandColors } from "../../config/brand.js";
import { CommunityCustomIds } from "../../constants/community.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export interface OnboardingSnapshot {
  readonly members: number;
  readonly registered: number;
  readonly verified: number;
  readonly unregistered: number;
  readonly verificationRequired: number;
  readonly awaitingOperationsReview: number;
  readonly reminderEligible: number;
}

export function createOnboardingDashboardView(
  snapshot: OnboardingSnapshot,
  resultMessage?: string,
): ContainerBuilder {
  const registrationRate =
    snapshot.members === 0
      ? 0
      : Math.round((snapshot.registered / snapshot.members) * 100);
  const verificationRate =
    snapshot.members === 0
      ? 0
      : Math.round((snapshot.verified / snapshot.members) * 100);
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.onboarding.refresh)
      .setLabel("Refresh")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.onboarding.nudge)
      .setLabel("Send Eligible Reminders")
      .setEmoji("✉️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(snapshot.reminderEligible === 0),
  );

  return ViewFactory.createContainer(BrandColors.voraCyan)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Operations",
        "Player Onboarding",
        "Monitor the path from Discord member to verified Vora player without public pings.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Conversion overview",
          `**Human members:** ${snapshot.members}`,
          `**Registered:** ${snapshot.registered} · ${registrationRate}%`,
          `**Verified:** ${snapshot.verified} · ${verificationRate}%`,
          `**Not registered:** ${snapshot.unregistered}`,
          `**Verification evidence required:** ${snapshot.verificationRequired}`,
          `**Awaiting Operations review:** ${snapshot.awaitingOperationsReview}`,
          "",
          `**Eligible for a private reminder:** ${snapshot.reminderEligible}`,
          resultMessage ? `\n> ${resultMessage}` : null,
        ]
          .filter((entry): entry is string => entry !== null)
          .join("\n"),
      ),
    )
    .addActionRowComponents(actions)
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Reminders use a seven-day cooldown and are sent in controlled batches.",
      ),
    );
}
