import { MessageFlags } from "discord.js";

import {
  CustomIds,
  parseSquadLifecycleCustomId,
} from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { ActiveSquadParticipantRequiredError } from "../../services/errors/ActiveSquadParticipantRequiredError.js";
import { ActiveSquadUnavailableError } from "../../services/errors/ActiveSquadUnavailableError.js";
import { SquadCaptainRequiredError } from "../../services/errors/SquadCaptainRequiredError.js";
import { createAlertView } from "../../ui/createAlertView.js";
import { createClosedSquadView } from "../../ui/createClosedSquadView.js";

const button: Button = {
  customId: CustomIds.buttons.squad.lifecycle.route,

  matches(customId): boolean {
    return parseSquadLifecycleCustomId(customId) !== null;
  },

  async execute(client, interaction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      return;
    }

    const parsedCustomId = parseSquadLifecycleCustomId(interaction.customId);

    if (!parsedCustomId) {
      throw new ActiveSquadUnavailableError();
    }

    try {
      const squad = await client.services.teamFormation.closeActiveSquad(
        parsedCustomId.squadId,
        interaction.guildId,
        interaction.user.id,
        parsedCustomId.action === "complete" ? "completed" : "cancelled",
      );

      await interaction.update({
        components: [createClosedSquadView(squad)],
      });

      await client.services.squadVoice.cleanupVoiceChannel(
        interaction.guild,
        squad,
      );
    } catch (error: unknown) {
      if (
        error instanceof ActiveSquadParticipantRequiredError ||
        error instanceof ActiveSquadUnavailableError ||
        error instanceof SquadCaptainRequiredError
      ) {
        await interaction.reply({
          components: [
            createAlertView("warning", "Unable to Manage Squad", error.message),
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
