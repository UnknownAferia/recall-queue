import { MessageFlags } from "discord.js";

import {
  CustomIds,
  parseSquadResultCustomId,
} from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { ActiveSquadParticipantRequiredError } from "../../services/errors/ActiveSquadParticipantRequiredError.js";
import { SquadCaptainRequiredError } from "../../services/errors/SquadCaptainRequiredError.js";
import { SquadResultAlreadyAnsweredError } from "../../services/errors/SquadResultAlreadyAnsweredError.js";
import { SquadResultUnavailableError } from "../../services/errors/SquadResultUnavailableError.js";
import { createAlertView } from "../../ui/createAlertView.js";
import { createClosedSquadView } from "../../ui/createClosedSquadView.js";
import { createResultEvidenceModal } from "../../ui/createResultEvidenceModal.js";
import { createResultVerificationView } from "../../ui/createResultVerificationView.js";

const button: Button = {
  customId: CustomIds.buttons.squad.result.route,

  matches(customId): boolean {
    return parseSquadResultCustomId(customId) !== null;
  },

  async execute(client, interaction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      return;
    }

    const parsedCustomId = parseSquadResultCustomId(interaction.customId);

    if (!parsedCustomId) {
      throw new SquadResultUnavailableError();
    }

    try {
      if (parsedCustomId.action.startsWith("report-")) {
        await client.services.teamFormation.assertCanReportSquadResult(
          parsedCustomId.squadId,
          interaction.guildId,
          interaction.user.id,
        );

        await interaction.showModal(
          createResultEvidenceModal(
            parsedCustomId.squadId,
            parsedCustomId.action === "report-win" ? "win" : "loss",
          ),
        );
        return;
      }

      const squad = await client.services.teamFormation.respondToSquadResult(
        parsedCustomId.squadId,
        interaction.guildId,
        interaction.user.id,
        parsedCustomId.action === "confirm" ? "confirmed" : "disputed",
      );

      await interaction.update({
        components: [
          squad.status === "result_pending"
            ? createResultVerificationView(squad)
            : createClosedSquadView(squad),
        ],
      });

      if (squad.status !== "result_pending") {
        await client.services.squadVoice.cleanupVoiceChannel(
          interaction.guild,
          squad,
        );
      }
    } catch (error: unknown) {
      if (
        error instanceof ActiveSquadParticipantRequiredError ||
        error instanceof SquadCaptainRequiredError ||
        error instanceof SquadResultAlreadyAnsweredError ||
        error instanceof SquadResultUnavailableError
      ) {
        await interaction.reply({
          components: [
            createAlertView(
              "warning",
              "Unable to Verify Result",
              error.message,
            ),
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
