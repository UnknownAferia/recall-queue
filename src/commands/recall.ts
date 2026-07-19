import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../interfaces/Command.js";
import { createMainMenuComponents } from "../ui/createMainMenuComponents.js";
import { createMainMenuEmbed } from "../ui/createMainMenuEmbed.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("recall")
    .setDescription("Open the RecallQ main menu")
    .setContexts(InteractionContextType.Guild),

  async execute(client, interaction): Promise<void> {
    const player =
      await client.services.player.getByDiscordId(
        interaction.user.id,
      );

    await interaction.reply({
      embeds: [createMainMenuEmbed(player)],
      components: player ? createMainMenuComponents() : [],
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;