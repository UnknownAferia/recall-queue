import { MessageFlags } from "discord.js";

import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createBackToMainMenuButton } from "../../ui/createBackToMainMenuButton.js";
import { createPlayerProfileEmbed } from "../../ui/createPlayerProfileEmbed.js";
import { EmbedFactory } from "../../ui/EmbedFactory.js";

const button: Button = {
  customId: CustomIds.buttons.mainMenu.profile,

  async execute(client, interaction): Promise<void> {
    const player =
      await client.services.player.getByDiscordId(
        interaction.user.id,
      );

    if (!player) {
      await interaction.reply({
        embeds: [
          EmbedFactory.warning(
            "Player Profile Not Found",
            "Use `/register` to create your RecallQ player profile.",
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    await interaction.update({
      embeds: [createPlayerProfileEmbed(player)],
      components: [createBackToMainMenuButton()],
    });
  },
};

export default button;