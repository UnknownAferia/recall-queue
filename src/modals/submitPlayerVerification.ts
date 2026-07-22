import { MessageFlags } from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import type { Modal } from "../interfaces/Modal.js";
import { PlayerProfileNotFoundError } from "../services/errors/PlayerProfileNotFoundError.js";
import { PlayerVerificationError } from "../services/errors/PlayerVerificationError.js";
import { createAlertView } from "../ui/createAlertView.js";

const modal: Modal = {
  customId: CustomIds.modals.playerVerificationEvidence,

  async execute(client, interaction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      return;
    }

    const attachment = interaction.fields
      .getUploadedFiles(CustomIds.inputs.playerVerification.screenshot, true)
      .first();

    if (!attachment) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Screenshot Required",
            "Upload one screenshot showing your Mobile Legends profile.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    await interaction.reply({
      components: [
        createAlertView(
          "information",
          "Submitting Verification",
          "Vora is securely archiving your evidence for Operations review.",
        ),
      ],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });

    try {
      const request = await client.services.playerVerification.submit(
        interaction.guild,
        interaction.user.id,
        attachment,
      );

      await client.services.guildAccess.removeVerifiedPlayerRole(
        interaction.member,
      );

      await interaction.editReply({
        components: [
          createAlertView(
            "success",
            "Verification Submitted",
            `Operations received your evidence. Your request reference is \`${request.id}\`. Matchmaking access will unlock after approval.`,
          ),
        ],
      });
    } catch (error: unknown) {
      if (
        error instanceof PlayerVerificationError ||
        error instanceof PlayerProfileNotFoundError
      ) {
        await interaction.editReply({
          components: [
            createAlertView(
              "warning",
              "Verification Unavailable",
              error.message,
            ),
          ],
        });
        return;
      }

      throw error;
    }
  },
};

export default modal;
