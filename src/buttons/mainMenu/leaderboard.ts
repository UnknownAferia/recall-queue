import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createLeaderboardView } from "../../ui/createLeaderboardView.js";

const button: Button = {
  customId: CustomIds.buttons.mainMenu.leaderboard,

  async execute(client, interaction): Promise<void> {
    await interaction.deferUpdate();

    const [players, seasonal] = await Promise.all([
      client.services.player.getLeaderboard(),
      client.services.seasons.getLeaderboard(),
    ]);

    await interaction.editReply({
      components: [
        createLeaderboardView(players, interaction.user.id, seasonal),
      ],
    });
  },
};

export default button;
