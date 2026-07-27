import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import { CommunityCustomIds } from "../../constants/community.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

function createTicketButton(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.ticket.open)
      .setLabel("Open a Private Ticket")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Primary),
  );
}

export function createHelpView(
  iconAttachmentName?: string,
): ContainerBuilder {
  const view = ViewFactory.createContainer(0x5865f2);

  ViewFactory.addHeading(
    view,
    "Vora Support",
    "Help Center",
    "Quick answers for onboarding, matchmaking, results and community safety.",
    iconAttachmentName,
    "Vora support",
  );

  return view
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Getting started",
          "**1.** Open `register` and click **Register & Submit**.",
          "**2.** Wait for Operations to approve your MLBB account evidence.",
          "**3.** Open `/vora` and configure two different preferred roles.",
          "**4.** Join `queue-lobby`, enter the teammate pool and accept the ready check.",
          "**5.** Queue as five in MLBB; the captain reports the result afterward.",
          "",
          "### Common issues",
          "**Verification not moving:** Check whether it is pending in your profile. If no request exists, use **Submit Verification** in `register`; otherwise open a ticket.",
          "**Cannot enter the pool:** Check approval, role preferences, `queue-lobby`, service status and active cooldowns.",
          "**Ready check unavailable:** The deadline passed or the squad was already cancelled. Missed responses may apply a cooldown.",
          "**Result awaiting action:** The captain must provide a genuine screenshot and squad members must answer the confirmation before it expires.",
          "**Result disputed:** Operations reviews the archived screenshot, responses and audit history.",
          "**Not enough players:** Enable voluntary Squad Alerts or join an upcoming community session from `matchmaking-status`.",
          "**Report conduct:** Right-click a message or member and select `Apps` → `Report Message` or `Report User`.",
          "**Appeal moderation:** Open a private ticket and include your `VORA-######` case reference.",
          "",
          "### Before opening a ticket",
          "Include your IGN and any relevant request, squad or moderation reference. Never post passwords or authentication codes.",
        ].join("\n"),
      ),
    )
    .addActionRowComponents(createTicketButton())
    .addTextDisplayComponents(
      ViewFactory.footer("Never share passwords, bot tokens or login codes."),
    );
}
