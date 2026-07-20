import { MessageFlags } from "discord.js";

import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createAlertView } from "../../ui/createAlertView.js";
import { createRolePreferencesView } from "../../ui/createRolePreferencesView.js";

const button: Button = {
  customId: CustomIds.buttons.mainMenu.preferences,

  async execute(client, interaction): Promise<void> {
    const player =
      await client.services.player.getByDiscordId(
        interaction.user.id,
      );

    if (!player) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Player Profile Not Found",
            "Use `/register` to create your Vora player profile.",
          ),
        ],
        flags:
          MessageFlags.Ephemeral |
          MessageFlags.IsComponentsV2,
      });

      return;
    }

    await interaction.update({
      components: [createRolePreferencesView(player)],
    });
  },
};

export default button;
