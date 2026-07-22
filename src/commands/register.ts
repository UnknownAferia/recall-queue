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
import { isPlayerVerificationApproved } from "../constants/playerVerification.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register your Mobile Legends account")
    .setContexts(InteractionContextType.Guild),

  async execute(client, interaction): Promise<void> {
    const player = await client.services.player.getByDiscordId(
      interaction.user.id,
    );

    if (player) {
      if (interaction.inCachedGuild()) {
        await client.services.guildAccess.synchronizeVerifiedPlayerRole(
          interaction.member,
          player.verification.status,
        );
      }

      await interaction.reply({
        components: [
          createAlertView(
            "information",
            "Profile Already Connected",
            isPlayerVerificationApproved(player.verification.status)
              ? "Your Discord account is already connected to a verified Vora player profile. Server access has been synchronized."
              : "Your profile is registered but not verified yet. Use `/verify-account` to submit your Mobile Legends profile screenshot.",
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
