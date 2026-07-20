import {
  ActionRowBuilder,
  InteractionContextType,
  MessageFlags,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import type { Command } from "../interfaces/Command.js";
import { createAlertView } from "../ui/createAlertView.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register your Mobile Legends account")
    .setContexts(InteractionContextType.Guild),

  async execute(client, interaction): Promise<void> {
    const isRegistered =
      await client.services.player.isRegistered(interaction.user.id);

    if (isRegistered) {
      if (interaction.inCachedGuild()) {
        await client.services.guildAccess.ensureVerifiedPlayerRole(
          interaction.member,
        );
      }

      await interaction.reply({
        components: [
          createAlertView(
            "information",
            "Profile Already Connected",
            "Your Discord account is already connected to a Vora player profile. Server access has been synchronized.",
          ),
        ],
        flags:
          MessageFlags.Ephemeral |
          MessageFlags.IsComponentsV2,
      });

      return;
    }

    const ignInput = new TextInputBuilder()
      .setCustomId(CustomIds.inputs.registerPlayer.ign)
      .setLabel("In-game name")
      .setPlaceholder("Enter your Mobile Legends name")
      .setStyle(TextInputStyle.Short)
      .setMinLength(2)
      .setMaxLength(32)
      .setRequired(true);

    const playerIdInput = new TextInputBuilder()
      .setCustomId(CustomIds.inputs.registerPlayer.playerId)
      .setLabel("Player ID")
      .setPlaceholder("Example: 123456789")
      .setStyle(TextInputStyle.Short)
      .setMinLength(4)
      .setMaxLength(15)
      .setRequired(true);

    const serverIdInput = new TextInputBuilder()
      .setCustomId(CustomIds.inputs.registerPlayer.serverId)
      .setLabel("Server ID")
      .setPlaceholder("Example: 1234")
      .setStyle(TextInputStyle.Short)
      .setMinLength(1)
      .setMaxLength(8)
      .setRequired(true);

    const modal = new ModalBuilder()
      .setCustomId(CustomIds.modals.registerPlayer)
      .setTitle("Vora Registration")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          ignInput,
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          playerIdInput,
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          serverIdInput,
        ),
      );

    await interaction.showModal(modal);
  },
};

export default command;
