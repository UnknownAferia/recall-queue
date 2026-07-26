import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../interfaces/Command.js";
import { createAlertView } from "../ui/createAlertView.js";
import { isPlayerVerificationApproved } from "../constants/playerVerification.js";
import { createPlayerRegistrationModal } from "../ui/createPlayerRegistrationModal.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register your Mobile Legends account")
    .setContexts(InteractionContextType.Guild),

  async execute(client, interaction): Promise<void> {
    const player = await client.services.player.getByDiscordId(
      interaction.user.id,
    );

    if (player) {
      if (interaction.inCachedGuild()) {
        await client.services.guildAccess.synchronizeVerifiedPlayerRole(
          interaction.member,
          player.verification.status,
        );
      }

      await interaction.reply({
        components: [
          createAlertView(
            "information",
            "Profile Already Connected",
            isPlayerVerificationApproved(player.verification.status)
              ? "Your Discord account is already connected to a verified Vora player profile. Server access has been synchronized."
              : "Your profile is registered but not verified yet. Use `/verify-account` to submit your Mobile Legends profile screenshot.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });

      return;
    }

    await interaction.showModal(createPlayerRegistrationModal());
  },
};

export default command;
