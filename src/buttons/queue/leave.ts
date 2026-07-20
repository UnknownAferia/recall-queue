import { MessageFlags } from "discord.js";

import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { PlayerNotInQueueError } from "../../services/errors/PlayerNotInQueueError.js";
import { createAlertView } from "../../ui/createAlertView.js";
import { createQueueView } from "../../ui/createQueueView.js";

const button: Button = {
  customId: CustomIds.buttons.queue.leave,

  async execute(client, interaction): Promise<void> {
    if (!interaction.guildId) {
      return;
    }

    try {
      const queue = await client.services.queue.leaveQueue(
        interaction.guildId,
        interaction.user.id,
      );
      const bannedUntil = await client.services.queue.getActiveSuspension(
        interaction.user.id,
      );

      await interaction.update({
        components: [createQueueView(queue, interaction.user.id, bannedUntil)],
      });
    } catch (error: unknown) {
      if (error instanceof PlayerNotInQueueError) {
        await interaction.reply({
          components: [
            createAlertView("warning", "Unable to Leave Queue", error.message),
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });

        return;
      }

      throw error;
    }
  },
};

export default button;
