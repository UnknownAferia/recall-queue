import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createBackToMainMenuButton } from "../../ui/createBackToMainMenuButton.js";
import { EmbedFactory } from "../../ui/EmbedFactory.js";

const button: Button = {
  customId: CustomIds.buttons.mainMenu.matchHistory,

  async execute(_client, interaction): Promise<void> {
    await interaction.update({
      embeds: [
        EmbedFactory.information(
          "Match History",
          "You have not played any competitive RecallQ matches yet.",
        ),
      ],
      components: [createBackToMainMenuButton()],
    });
  },
};

export default button;