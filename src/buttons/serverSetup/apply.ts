import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createServerSetupView } from "../../ui/createServerSetupView.js";

const button: Button = {
  customId: CustomIds.buttons.serverSetup.apply,

  async execute(client, interaction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      return;
    }

    if (interaction.guild.ownerId !== interaction.user.id) {
      return;
    }

    await interaction.deferUpdate();

    const plan = await client.services.guildSetup.apply(interaction.guild);

    await interaction.editReply({
      components: [
        createServerSetupView(interaction.guild.name, plan, true),
      ],
    });
  },
};

export default button;
