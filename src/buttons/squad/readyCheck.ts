import { MessageFlags } from "discord.js";

import {
  CustomIds,
  parseSquadReadyCheckCustomId,
} from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { ReadyCheckAlreadyAnsweredError } from "../../services/errors/ReadyCheckAlreadyAnsweredError.js";
import { ReadyCheckParticipantRequiredError } from "../../services/errors/ReadyCheckParticipantRequiredError.js";
import { ReadyCheckUnavailableError } from "../../services/errors/ReadyCheckUnavailableError.js";
import { SquadVoiceUnavailableError } from "../../services/errors/SquadVoiceUnavailableError.js";
import { createActiveSquadView } from "../../ui/createActiveSquadView.js";
import { createAlertView } from "../../ui/createAlertView.js";
import { createClosedSquadView } from "../../ui/createClosedSquadView.js";
import { createReadyCheckView } from "../../ui/createReadyCheckView.js";

const button: Button = {
  customId: CustomIds.buttons.squad.readyCheck.route,

  matches(customId): boolean {
    return parseSquadReadyCheckCustomId(customId) !== null;
  },

  async execute(client, interaction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      return;
    }

    const parsedCustomId = parseSquadReadyCheckCustomId(interaction.customId);

    if (!parsedCustomId) {
      throw new ReadyCheckUnavailableError();
    }

    await interaction.deferUpdate();

    try {
      let squad = await client.services.teamFormation.respondToReadyCheck(
        parsedCustomId.squadId,
        interaction.guildId,
        interaction.user.id,
        parsedCustomId.action === "accept" ? "accepted" : "declined",
      );

      let voiceWarning: string | null = null;

      if (squad.status === "active") {
        try {
          squad = await client.services.squadVoice.ensureVoiceChannel(
            interaction.guild,
            squad,
          );
        } catch (error: unknown) {
          if (!(error instanceof SquadVoiceUnavailableError)) {
            throw error;
          }

          voiceWarning = error.message;
        }
      }

      await interaction.editReply({
        components: [
          squad.status === "active"
            ? createActiveSquadView(squad)
            : squad.status === "ready_check"
              ? createReadyCheckView(squad)
              : createClosedSquadView(squad),
        ],
      });

      if (squad.status === "ready_check") {
        client.services.readyCheckExpiration.schedule(
          squad,
          interaction.message.id,
          async (expiredSquad) => {
            await interaction.editReply({
              components: [createClosedSquadView(expiredSquad)],
            });
          },
        );
      } else {
        client.services.readyCheckExpiration.cancel(
          squad.id,
          interaction.message.id,
        );
      }

      if (voiceWarning) {
        await interaction.followUp({
          components: [
            createAlertView("warning", "Squad Voice Unavailable", voiceWarning),
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }
    } catch (error: unknown) {
      if (
        error instanceof ReadyCheckUnavailableError ||
        error instanceof ReadyCheckParticipantRequiredError ||
        error instanceof ReadyCheckAlreadyAnsweredError
      ) {
        await interaction.followUp({
          components: [
            createAlertView("warning", "Unable to Respond", error.message),
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });

        return;
      }

      throw error;
    }
  },
};

export default button;
