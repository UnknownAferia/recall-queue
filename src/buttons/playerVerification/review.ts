import { MessageFlags, PermissionFlagsBits } from "discord.js";

import {
  CustomIds,
  parsePlayerVerificationReviewCustomId,
} from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { PlayerVerificationError } from "../../services/errors/PlayerVerificationError.js";
import { createAlertView } from "../../ui/createAlertView.js";
import { createPlayerVerificationRejectionModal } from "../../ui/createPlayerVerificationRejectionModal.js";
import { createResolvedPlayerVerificationReviewView } from "../../ui/createPlayerVerificationReviewView.js";

const button: Button = {
  customId: CustomIds.buttons.playerVerification.route,

  matches(customId): boolean {
    return parsePlayerVerificationReviewCustomId(customId) !== null;
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

    const parsed = parsePlayerVerificationReviewCustomId(
      interaction.customId,
    );

    if (!parsed) {
      throw new PlayerVerificationError(
        "This verification action is invalid.",
      );
    }

    if (parsed.action === "reject") {
      await interaction.showModal(
        createPlayerVerificationRejectionModal(parsed.requestId),
      );
      return;
    }

    await interaction.deferUpdate();

    try {
      const request = await client.services.playerVerification.review(
        parsed.requestId,
        interaction.guildId,
        interaction.user.id,
        "approve",
      );
      const member = await interaction.guild.members
        .fetch(request.playerDiscordId)
        .catch(() => null);

      if (member) {
        await client.services.guildAccess.synchronizeVerifiedPlayerRole(
          member,
          "verified",
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

export default button;
