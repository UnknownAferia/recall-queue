import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createQueueComponents } from "../../ui/createQueueComponents.js";
import { createQueueEmbed } from "../../ui/createQueueEmbed.js";

const button: Button = {
  customId: CustomIds.buttons.mainMenu.queue,

  async execute(client, interaction): Promise<void> {
    if (!interaction.guildId) {
      return;
    }

    const queue = await client.services.queue.getQueue(
      interaction.guildId,
    );

    await interaction.update({
      embeds: [
        createQueueEmbed(queue, interaction.user.id),
      ],
      components: createQueueComponents(
        queue,
        interaction.user.id,
      ),
    });
  },
};

export default button;