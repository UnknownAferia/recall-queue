import { MessageFlags } from "discord.js";

import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createAlertView } from "../../ui/createAlertView.js";
import { createSeasonModal } from "../../ui/createSeasonModal.js";

const button: Button = {
  customId: CustomIds.buttons.seasonAdmin.create,

  async execute(_client, interaction): Promise<void> {
    if (
      !interaction.inCachedGuild() ||
      interaction.guild.ownerId !== interaction.user.id
    ) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Server Owner Required",
            "Only the Discord server owner can schedule a Vora season.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });

      return;
    }

    await interaction.showModal(createSeasonModal());
  },
};

export default button;
