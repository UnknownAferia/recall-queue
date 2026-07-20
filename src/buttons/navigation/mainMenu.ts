import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createMainMenuView } from "../../ui/createMainMenuView.js";

const button: Button = {
  customId: CustomIds.buttons.navigation.mainMenu,

  async execute(client, interaction): Promise<void> {
    const player =
      await client.services.player.getByDiscordId(
        interaction.user.id,
      );

    await interaction.update({
      components: [createMainMenuView(player)],
    });
  },
};

export default button;
