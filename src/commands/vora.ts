import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../interfaces/Command.js";
import { createMainMenuView } from "../ui/createMainMenuView.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("vora")
    .setDescription("Open the Vora main menu")
    .setContexts(InteractionContextType.Guild),

  async execute(client, interaction): Promise<void> {
    const player = await client.services.player.getByDiscordId(
      interaction.user.id,
    );

    if (player && interaction.inCachedGuild()) {
      await client.services.guildAccess.ensureVerifiedPlayerRole(
        interaction.member,
      );
      await client.services.divisionRoles.synchronizeMember(
        interaction.member,
        player,
      );
    }

    await interaction.reply({
      components: [createMainMenuView(player)],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
