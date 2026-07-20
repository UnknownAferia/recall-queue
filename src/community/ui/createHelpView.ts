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

export function createHelpView(): ContainerBuilder {
  return ViewFactory.createContainer(0x5865f2)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Vora Support",
        "Help Center",
        "Everything needed to enter competitive teammate matchmaking.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Getting started",
          "**1.** Use `/register` to connect your Mobile Legends account.",
          "**2.** Open `/vora` and configure two different preferred roles.",
          "**3.** Join the managed `queue-lobby` voice channel.",
          "**4.** Enter the teammate pool and accept the ready check in time.",
          "**5.** Queue together in MLBB and submit the result screenshot afterward.",
          "",
          "### Common issues",
          "**Cannot join the queue:** Check registration, role preferences, voice lobby and active cooldowns.",
          "**Ready check unavailable:** It expired or the squad was already cancelled.",
          "**Result disputed:** Staff will review the archived screenshot and confirmations.",
          "",
          "Need private help with an account, sanction or match result? Open a ticket below.",
        ].join("\n"),
      ),
    )
    .addActionRowComponents(createTicketButton())
    .addTextDisplayComponents(
      ViewFactory.footer("Never share passwords, bot tokens or login codes."),
    );
}
