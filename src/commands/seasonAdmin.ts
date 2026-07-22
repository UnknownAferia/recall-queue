import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../interfaces/Command.js";
import { createAlertView } from "../ui/createAlertView.js";
import { createSeasonControlView } from "../ui/createSeasonControlView.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("season-admin")
    .setDescription("Open the global Vora season control center")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(client, interaction): Promise<void> {
    if (
      !interaction.inCachedGuild() ||
      interaction.guild.ownerId !== interaction.user.id
    ) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Server Owner Required",
            "Only the Discord server owner can manage Vora's global seasons.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });

      return;
    }

    const state = await client.services.seasons.getControlState();

    await interaction.reply({
      components: [createSeasonControlView(state)],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
