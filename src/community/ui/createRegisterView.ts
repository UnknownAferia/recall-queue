import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import { BrandColors } from "../../config/brand.js";
import { CommunityCustomIds } from "../../constants/community.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export function createRegisterView(
  iconAttachmentName?: string,
): ContainerBuilder {
  const view = ViewFactory.createContainer(BrandColors.voraCyan);

  ViewFactory.addHeading(
    view,
    "Player Onboarding",
    "Register & Verify",
    "Create your competitive Vora identity. Registration alone does not unlock matchmaking.",
    iconAttachmentName,
    "Vora account verification",
  );

  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.onboarding.register)
      .setLabel("Register Now")
      .setEmoji("📝")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.onboarding.verify)
      .setLabel("Submit Verification")
      .setEmoji("🛡️")
      .setStyle(ButtonStyle.Success),
  );

  return view
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### 1 · Create your player profile",
          "Click **Register Now** below and enter your current Mobile Legends information:",
          "- In-game name (IGN)",
          "- Player ID",
          "- Server ID",
          "",
          "Your Discord account can be connected to one MLBB account.",
          "",
          "### 2 · Verify your MLBB account",
          "Click **Submit Verification** and upload a current screenshot of your Mobile Legends profile.",
          "",
          "The screenshot must clearly show the **IGN, Player ID and Server ID** entered during registration. Vora Operations reviews the evidence privately.",
          "",
          "> Matchmaking remains locked while your verification is pending.",
          "",
          "### 3 · Complete your role identity",
          "Once approved, open `/vora` → **Preferences** and choose two different preferred roles before entering the teammate pool.",
        ].join("\n"),
      ),
    )
    .addActionRowComponents(actions)
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Verification status",
          "⏳ **Pending** — Operations is reviewing your evidence.",
          "✅ **Verified** — Your account can access matchmaking after role setup.",
          "❌ **Rejected** — Review the reason and submit corrected evidence with `/verify-account`.",
          "",
          "### Keep your account secure",
          "Only upload the requested profile screenshot. **Never share passwords, login codes or authentication details.**",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Need help with registration or verification? Open a private support ticket.",
      ),
    );
}
