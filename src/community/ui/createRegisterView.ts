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
    "Create your player profile and submit account evidence through one private onboarding flow.",
    iconAttachmentName,
    "Vora account verification",
  );

  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.onboarding.register)
      .setLabel("Register & Submit")
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
          "### 1 · Register and submit evidence",
          "Click **Register & Submit**. One private form collects:",
          "- In-game name (IGN)",
          "- Player ID",
          "- Server ID",
          "- One current MLBB profile screenshot",
          "",
          "Your player profile and verification request are created together. One Discord account can be connected to one MLBB account.",
          "",
          "### 2 · Operations review",
          "The screenshot must clearly show the **IGN, Player ID and Server ID** entered in the same form. Vora Operations reviews the evidence privately.",
          "",
          "Already registered without an open request, or previously rejected? Click **Submit Verification** to send corrected evidence without registering again.",
          "",
          "> You can view your profile while pending, but matchmaking remains locked until approval.",
          "",
          "### 3 · Complete your role identity",
          "Once approved, open `/vora` → **Preferences** and choose two different preferred roles. Then join `queue-lobby` whenever you are ready to enter the teammate pool.",
        ].join("\n"),
      ),
    )
    .addActionRowComponents(actions)
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Verification status",
          "⏳ **Pending** — Your evidence is waiting for Operations review.",
          "✅ **Verified** — Your account is approved; finish role setup to access matchmaking.",
          "❌ **Rejected** — Review the reason and click **Submit Verification** with corrected evidence.",
          "",
          "### Keep your account secure",
          "Only upload the requested profile screenshot. **Never share passwords, login codes or authentication details.**",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "A stuck request or account mismatch requires a private support ticket—never create a second account.",
      ),
    );
}
