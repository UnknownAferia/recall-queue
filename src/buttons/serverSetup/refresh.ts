import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createServerSetupView } from "../../ui/createServerSetupView.js";

const button: Button = {
  customId: CustomIds.buttons.serverSetup.refresh,

  async execute(client, interaction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      return;
    }

    await interaction.deferUpdate();

    const plan = await client.services.guildSetup.createPlan(
      interaction.guild,
    );

    await interaction.editReply({
      components: [createServerSetupView(interaction.guild.name, plan)],
    });
  },
};

export default button;
