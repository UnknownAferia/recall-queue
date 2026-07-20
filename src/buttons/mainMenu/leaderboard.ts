import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createLeaderboardView } from "../../ui/createLeaderboardView.js";

const button: Button = {
  customId:
    CustomIds.buttons.mainMenu.leaderboard,

  async execute(client, interaction): Promise<void> {
    await interaction.deferUpdate();

    const players =
      await client.services.player.getLeaderboard();

    await interaction.editReply({
      components: [
        createLeaderboardView(
          players,
          interaction.user.id,
        ),
      ],
    });
  },
};

export default button;
