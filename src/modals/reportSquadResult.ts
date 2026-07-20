import { MessageFlags } from "discord.js";

import {
  CustomIds,
  parseSquadResultEvidenceCustomId,
} from "../constants/customIds.js";
import type { Modal } from "../interfaces/Modal.js";
import { ActiveSquadParticipantRequiredError } from "../services/errors/ActiveSquadParticipantRequiredError.js";
import { ResultEvidenceError } from "../services/errors/ResultEvidenceError.js";
import { SquadCaptainRequiredError } from "../services/errors/SquadCaptainRequiredError.js";
import { SquadResultUnavailableError } from "../services/errors/SquadResultUnavailableError.js";
import type { SquadResultEvidence } from "../types/squad.js";
import { createAlertView } from "../ui/createAlertView.js";
import { createClosedSquadView } from "../ui/createClosedSquadView.js";
import { createResultVerificationView } from "../ui/createResultVerificationView.js";

const modal: Modal = {
  customId: CustomIds.modals.squadResultEvidence.route,

  matches(customId): boolean {
    return parseSquadResultEvidenceCustomId(customId) !== null;
  },

  async execute(client, interaction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      return;
    }

    const parsedCustomId = parseSquadResultEvidenceCustomId(
      interaction.customId,
    );

    if (!parsedCustomId) {
      throw new SquadResultUnavailableError();
    }

    const attachment = interaction.fields
      .getUploadedFiles(CustomIds.inputs.squadResultEvidence.screenshot, true)
      .first();

    if (!attachment) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Screenshot Required",
            "Upload one screenshot of the Mobile Legends result screen.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    try {
      client.services.resultEvidence.validate(attachment);
    } catch (error: unknown) {
      if (error instanceof ResultEvidenceError) {
        await interaction.reply({
          components: [
            createAlertView("warning", "Invalid Screenshot", error.message),
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }

      throw error;
    }

    await interaction.deferUpdate();

    let evidence: SquadResultEvidence;

    try {
      evidence = await client.services.resultEvidence.archive(
        interaction.guild,
        parsedCustomId.squadId,
        interaction.user.id,
        parsedCustomId.outcome,
        attachment,
      );
    } catch (error: unknown) {
      if (error instanceof ResultEvidenceError) {
        await interaction.editReply({
          components: [
            createAlertView("warning", "Evidence Upload Failed", error.message),
          ],
        });
        return;
      }

      throw error;
    }

    let squad;

    try {
      squad = await client.services.teamFormation.reportSquadResult(
        parsedCustomId.squadId,
        interaction.guildId,
        interaction.user.id,
        parsedCustomId.outcome,
        evidence,
      );
    } catch (error: unknown) {
      await client.services.resultEvidence.discard(interaction.guild, evidence);

      if (
        error instanceof ActiveSquadParticipantRequiredError ||
        error instanceof SquadCaptainRequiredError ||
        error instanceof SquadResultUnavailableError
      ) {
        await interaction.editReply({
          components: [
            createAlertView(
              "warning",
              "Unable to Report Result",
              error.message,
            ),
          ],
        });
        return;
      }

      throw error;
    }

    squad =
      await client.services.developmentSimulation.confirmResultIfSimulated(
        squad,
      );

    await interaction.editReply({
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
  },
};

export default modal;
