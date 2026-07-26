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
  readonly excluded: number;
  readonly eligibleMembers: number;
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
    snapshot.eligibleMembers === 0
      ? 0
      : Math.round((snapshot.registered / snapshot.eligibleMembers) * 100);
  const verificationRate =
    snapshot.eligibleMembers === 0
      ? 0
      : Math.round((snapshot.verified / snapshot.eligibleMembers) * 100);
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
          `**Excluded from onboarding:** ${snapshot.excluded}`,
          `**Eligible players:** ${snapshot.eligibleMembers}`,
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
        "Use /verification-inbox for the player-level worklist. Reminders use a seven-day cooldown and controlled batches.",
      ),
    );
}
