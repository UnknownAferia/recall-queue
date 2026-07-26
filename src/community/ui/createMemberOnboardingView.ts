import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import { BrandColors } from "../../config/brand.js";
import { CommunityCustomIds } from "../../constants/community.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export function createMemberOnboardingView(
  registerChannelUrl: string,
): ContainerBuilder {
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.onboarding.register)
      .setLabel("Register Now")
      .setEmoji("📝")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setLabel("Open Vora Onboarding")
      .setEmoji("➡️")
      .setStyle(ButtonStyle.Link)
      .setURL(registerChannelUrl),
  );

  return ViewFactory.createContainer(BrandColors.voraCyan)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Welcome to Vora",
        "Your Team Starts Here",
        "Create and verify your Mobile Legends profile to unlock Vora's five-player teammate matchmaking.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### It takes three short steps",
          "**1. Register** your IGN, Player ID and Server ID.",
          "**2. Verify** them with one current MLBB profile screenshot.",
          "**3. Choose** your primary and secondary roles in `/vora`.",
          "",
          "> Registration is private. Your screenshot is visible only to Vora Operations.",
        ].join("\n"),
      ),
    )
    .addActionRowComponents(actions)
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Need help? Open a private ticket in the Vora server.",
      ),
    );
}
