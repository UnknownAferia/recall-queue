import { MessageFlags } from "discord.js";

import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { PlayerNotInQueueError } from "../../services/errors/PlayerNotInQueueError.js";
import { createQueueComponents } from "../../ui/createQueueComponents.js";
import { createQueueEmbed } from "../../ui/createQueueEmbed.js";
import { EmbedFactory } from "../../ui/EmbedFactory.js";

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

      await interaction.update({
        embeds: [
          createQueueEmbed(queue, interaction.user.id),
        ],
        components: createQueueComponents(
          queue,
          interaction.user.id,
        ),
      });
    } catch (error: unknown) {
      if (error instanceof PlayerNotInQueueError) {
        await interaction.reply({
          embeds: [
            EmbedFactory.warning(
              "Unable to Leave Queue",
              error.message,
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      throw error;
    }
  },
};

export default button;