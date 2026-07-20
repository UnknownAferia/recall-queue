import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../interfaces/Command.js";
import { createAlertView } from "../ui/createAlertView.js";
import { createServerSetupView } from "../ui/createServerSetupView.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("server-setup")
    .setDescription("Preview the Vora server blueprint")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(client, interaction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      return;
    }

    if (interaction.guild.ownerId !== interaction.user.id) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Server Owner Required",
            "Only the Discord server owner can apply the Vora server blueprint.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });

      return;
    }

    await interaction.reply({
      components: [
        createAlertView(
          "information",
          "Inspecting Server",
          "Vora is comparing this server with the current blueprint.",
        ),
      ],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });

    const plan = await client.services.guildSetup.createPlan(
      interaction.guild,
    );

    await interaction.editReply({
      components: [createServerSetupView(interaction.guild.name, plan)],
    });
  },
};

export default command;
