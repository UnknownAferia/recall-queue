import { MessageFlags } from "discord.js";

import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createAlertView } from "../../ui/createAlertView.js";
import { createSeasonControlView } from "../../ui/createSeasonControlView.js";

const button: Button = {
  customId: CustomIds.buttons.seasonAdmin.cancel,

  async execute(client, interaction): Promise<void> {
    if (
      !interaction.inCachedGuild() ||
      interaction.guild.ownerId !== interaction.user.id
    ) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Server Owner Required",
            "Only the Discord server owner can access season controls.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });

      return;
    }

    await interaction.deferUpdate();
    const state = await client.services.seasons.getControlState();

    await interaction.editReply({
      components: [createSeasonControlView(state)],
    });
  },
};

export default button;
