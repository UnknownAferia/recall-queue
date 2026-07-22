import { MessageFlags } from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import type { Modal } from "../interfaces/Modal.js";
import { GameAccountAlreadyRegisteredError } from "../services/errors/GameAccountAlreadyRegisteredError.js";
import { InvalidRegistrationDataError } from "../services/errors/InvalidRegistrationDataError.js";
import { PlayerAlreadyRegisteredError } from "../services/errors/PlayerAlreadyRegisteredError.js";
import { createAlertView } from "../ui/createAlertView.js";
import { createPlayerProfileView } from "../ui/createPlayerProfileView.js";

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

      if (interaction.inCachedGuild()) {
        await client.services.guildAccess.synchronizeVerifiedPlayerRole(
          interaction.member,
          player.verification.status,
        );
      }

      await interaction.reply({
        components: [createPlayerProfileView(player)],
        flags:
          MessageFlags.Ephemeral |
          MessageFlags.IsComponentsV2,
      });
    } catch (error: unknown) {
      if (
        error instanceof PlayerAlreadyRegisteredError ||
        error instanceof GameAccountAlreadyRegisteredError ||
        error instanceof InvalidRegistrationDataError
      ) {
        await interaction.reply({
          components: [
            createAlertView(
              "error",
              "Registration Failed",
              error.message,
            ),
          ],
          flags:
            MessageFlags.Ephemeral |
            MessageFlags.IsComponentsV2,
        });

        return;
      }

      throw error;
    }
  },
};

export default modal;
