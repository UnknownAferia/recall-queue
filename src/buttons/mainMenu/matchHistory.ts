import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createMatchHistoryView } from "../../ui/createMatchHistoryView.js";

const button: Button = {
  customId: CustomIds.buttons.mainMenu.matchHistory,

  async execute(client, interaction): Promise<void> {
    if (!interaction.guildId) {
      return;
    }

    const history = await client.services.teamFormation.getVerifiedHistory(
      interaction.guildId,
      interaction.user.id,
    );

    await interaction.update({
      components: [createMatchHistoryView(history, interaction.user.id)],
    });
  },
};

export default button;
