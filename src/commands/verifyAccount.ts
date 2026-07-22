import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { isPlayerVerificationApproved } from "../constants/playerVerification.js";
import type { Command } from "../interfaces/Command.js";
import { createAlertView } from "../ui/createAlertView.js";
import { createPlayerVerificationModal } from "../ui/createPlayerVerificationModal.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("verify-account")
    .setDescription("Submit proof of your Mobile Legends account")
    .setContexts(InteractionContextType.Guild),

  async execute(client, interaction): Promise<void> {
    const player = await client.services.player.getByDiscordId(
      interaction.user.id,
    );

    if (!player) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Registration Required",
            "Create your Vora player profile with `/register` before submitting verification evidence.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    if (isPlayerVerificationApproved(player.verification.status)) {
      if (interaction.inCachedGuild()) {
        await client.services.guildAccess.synchronizeVerifiedPlayerRole(
          interaction.member,
          player.verification.status,
        );
      }

      await interaction.reply({
        components: [
          createAlertView(
            "success",
            "Account Already Verified",
            "Your Mobile Legends account is already approved for Vora matchmaking.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    if (
      await client.services.playerVerification.hasPendingRequest(
        interaction.user.id,
      )
    ) {
      await interaction.reply({
        components: [
          createAlertView(
            "information",
            "Verification Pending",
            "Your evidence is already waiting for Operations review. You will receive access after approval.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    await interaction.showModal(createPlayerVerificationModal());
  },
};

export default command;
