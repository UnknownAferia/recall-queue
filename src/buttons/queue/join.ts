import { MessageFlags } from "discord.js";

import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { PlayerAlreadyInQueueError } from "../../services/errors/PlayerAlreadyInQueueError.js";
import { PlayerRegistrationRequiredError } from "../../services/errors/PlayerRegistrationRequiredError.js";
import { QueueFullError } from "../../services/errors/QueueFullError.js";
import { QueueLockedError } from "../../services/errors/QueueLockedError.js";
import { createQueueComponents } from "../../ui/createQueueComponents.js";
import { createQueueEmbed } from "../../ui/createQueueEmbed.js";
import { EmbedFactory } from "../../ui/EmbedFactory.js";

const button: Button = {
  customId: CustomIds.buttons.queue.join,

  async execute(client, interaction): Promise<void> {
    if (!interaction.guildId) {
      return;
    }

    try {
      const queue = await client.services.queue.joinQueue(
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
      if (
        error instanceof PlayerAlreadyInQueueError ||
        error instanceof PlayerRegistrationRequiredError ||
        error instanceof QueueFullError ||
        error instanceof QueueLockedError
      ) {
        await interaction.reply({
          embeds: [
            EmbedFactory.warning(
              "Unable to Join Queue",
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