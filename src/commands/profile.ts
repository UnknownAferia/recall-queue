import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../interfaces/Command.js";
import { createAlertView } from "../ui/createAlertView.js";
import { createPlayerProfileView } from "../ui/createPlayerProfileView.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View your Vora player profile")
    .setContexts(InteractionContextType.Guild),

  async execute(client, interaction): Promise<void> {
    const player = await client.services.player.getByDiscordId(
      interaction.user.id,
    );

    if (!player) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Player Profile Not Found",
            "You must register your Mobile Legends account before viewing your profile. Use `/register` to get started.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });

      return;
    }

    if (interaction.inCachedGuild()) {
      await client.services.divisionRoles.synchronizeMember(
        interaction.member,
        player,
      );
    }

    await interaction.reply({
      components: [createPlayerProfileView(player)],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
