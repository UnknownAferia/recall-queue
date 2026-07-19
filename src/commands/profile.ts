import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../interfaces/Command.js";
import { createBackToMainMenuButton } from "../ui/createBackToMainMenuButton.js";
import { createPlayerProfileEmbed } from "../ui/createPlayerProfileEmbed.js";
import { EmbedFactory } from "../ui/EmbedFactory.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your RecallQ player profile")
    .setContexts(InteractionContextType.Guild),

  async execute(client, interaction): Promise<void> {
    const player =
      await client.services.player.getByDiscordId(
        interaction.user.id,
      );

    if (!player) {
      await interaction.reply({
        embeds: [
          EmbedFactory.warning(
            "Player Profile Not Found",
            "You must register your Mobile Legends account before viewing your profile. Use `/register` to get started.",
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    await interaction.reply({
      embeds: [createPlayerProfileEmbed(player)],
      components: [createBackToMainMenuButton()],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;