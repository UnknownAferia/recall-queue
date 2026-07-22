import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createSeasonHistoryView } from "../../ui/createSeasonHistoryView.js";

const button: Button = {
  customId: CustomIds.buttons.mainMenu.seasonHistory,

  async execute(client, interaction): Promise<void> {
    await interaction.deferUpdate();
    const history = await client.services.seasons.getPlayerHistory(
      interaction.user.id,
    );

    await interaction.editReply({
      components: [createSeasonHistoryView(history)],
    });
  },
};

export default button;
