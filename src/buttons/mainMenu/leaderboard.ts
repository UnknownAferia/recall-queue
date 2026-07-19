import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createBackToMainMenuButton } from "../../ui/createBackToMainMenuButton.js";
import { EmbedFactory } from "../../ui/EmbedFactory.js";

const button: Button = {
  customId: CustomIds.buttons.mainMenu.leaderboard,

  async execute(_client, interaction): Promise<void> {
    await interaction.update({
      embeds: [
        EmbedFactory.information(
          "RSR Leaderboard",
          [
            "The leaderboard will become available after competitive matches have been completed.",
            "",
            "Players will be ranked by their Recall Skill Rating.",
          ].join("\n"),
        ),
      ],
      components: [createBackToMainMenuButton()],
    });
  },
};

export default button;