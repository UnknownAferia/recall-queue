import { MessageFlags, PermissionFlagsBits } from "discord.js";

import {
  CustomIds,
  parsePlayerVerificationRejectionCustomId,
} from "../constants/customIds.js";
import type { Modal } from "../interfaces/Modal.js";
import { PlayerVerificationError } from "../services/errors/PlayerVerificationError.js";
import { createAlertView } from "../ui/createAlertView.js";
import { createResolvedPlayerVerificationReviewView } from "../ui/createPlayerVerificationReviewView.js";

const modal: Modal = {
  customId: CustomIds.modals.playerVerificationRejection.route,

  matches(customId): boolean {
    return parsePlayerVerificationRejectionCustomId(customId) !== null;
  },

  async execute(client, interaction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      return;
    }

    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Operations Access Required",
            "You need the Moderate Members permission to review player accounts.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    const requestId = parsePlayerVerificationRejectionCustomId(
      interaction.customId,
    );

    if (!requestId) {
      throw new PlayerVerificationError(
        "This verification request is invalid.",
      );
    }

    const reason = interaction.fields.getTextInputValue(
      CustomIds.inputs.playerVerification.rejectionReason,
    );

    await interaction.deferUpdate();

    try {
      const request = await client.services.playerVerification.review(
        requestId,
        interaction.guildId,
        interaction.user.id,
        "reject",
        reason,
      );
      const member = await interaction.guild.members
        .fetch(request.playerDiscordId)
        .catch(() => null);

      if (member) {
        await client.services.guildAccess.synchronizeVerifiedPlayerRole(
          member,
          "rejected",
        );
      }

      await interaction.editReply(
        createResolvedPlayerVerificationReviewView(request),
      );
    } catch (error: unknown) {
      if (error instanceof PlayerVerificationError) {
        await interaction.followUp({
          components: [
            createAlertView(
              "warning",
              "Review Unavailable",
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

export default modal;
