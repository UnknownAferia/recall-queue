import { MessageFlags } from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import type { Modal } from "../interfaces/Modal.js";
import { GameAccountAlreadyRegisteredError } from "../services/errors/GameAccountAlreadyRegisteredError.js";
import { InvalidRegistrationDataError } from "../services/errors/InvalidRegistrationDataError.js";
import { PlayerAlreadyRegisteredError } from "../services/errors/PlayerAlreadyRegisteredError.js";
import { createBackToMainMenuButton } from "../ui/createBackToMainMenuButton.js";
import { createPlayerProfileEmbed } from "../ui/createPlayerProfileEmbed.js";
import { EmbedFactory } from "../ui/EmbedFactory.js";

const modal: Modal = {
  customId: CustomIds.modals.registerPlayer,

  async execute(client, interaction): Promise<void> {
    const ign = interaction.fields.getTextInputValue(
      CustomIds.inputs.registerPlayer.ign,
    );

    const playerId = interaction.fields.getTextInputValue(
      CustomIds.inputs.registerPlayer.playerId,
    );

    const serverId = interaction.fields.getTextInputValue(
      CustomIds.inputs.registerPlayer.serverId,
    );

    try {
      const player = await client.services.player.registerPlayer({
        discordId: interaction.user.id,
        discordUsername: interaction.user.username,
        ign,
        playerId,
        serverId,
      });

      await interaction.reply({
        content:
          "Your Mobile Legends account has been successfully connected to RecallQ.",
        embeds: [createPlayerProfileEmbed(player)],
        components: [createBackToMainMenuButton()],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error: unknown) {
      if (
        error instanceof PlayerAlreadyRegisteredError ||
        error instanceof GameAccountAlreadyRegisteredError ||
        error instanceof InvalidRegistrationDataError
      ) {
        await interaction.reply({
          embeds: [
            EmbedFactory.error(
              "Registration Failed",
              error.message,
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      throw error;
    }
  },
};

export default modal;