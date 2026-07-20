import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createQueueView } from "../../ui/createQueueView.js";

const button: Button = {
  customId: CustomIds.buttons.queue.refresh,

  async execute(client, interaction): Promise<void> {
    if (!interaction.guildId) {
      return;
    }

    const queue = await client.services.queue.getQueue(interaction.guildId);
    const bannedUntil = await client.services.queue.getActiveSuspension(
      interaction.user.id,
    );

    await interaction.update({
      components: [createQueueView(queue, interaction.user.id, bannedUntil)],
    });
  },
};

export default button;
