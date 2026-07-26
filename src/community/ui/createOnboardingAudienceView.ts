import type { ContainerBuilder } from "discord.js";

import { BrandColors } from "../../config/brand.js";
import type { OnboardingAudienceExclusion } from "../../types/community.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export function createOnboardingAudienceView(
  exclusions: readonly OnboardingAudienceExclusion[],
): ContainerBuilder {
  const visible = exclusions.slice(0, 25);
  const entries =
    visible.length === 0
      ? ["> No members are excluded from onboarding."]
      : visible.map(
          (exclusion) =>
            `- <@${exclusion.memberDiscordId}> — ${exclusion.reason}`,
        );

  if (exclusions.length > visible.length) {
    entries.push(
      `- …and ${exclusions.length - visible.length} additional exclusion(s).`,
    );
  }

  return ViewFactory.createContainer(BrandColors.voraCyan)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Operations",
        "Onboarding Audience",
        "Accounts in this list are excluded from conversion metrics and private onboarding reminders.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `### Active exclusions · ${exclusions.length}`,
          ...entries,
          "",
          "Exclusion does not block registration or matchmaking. It only removes an account from automated onboarding.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Use /onboarding-audience restore-member to return an account to the audience.",
      ),
    );
}
