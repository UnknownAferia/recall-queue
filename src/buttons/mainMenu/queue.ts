import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createActiveSquadView } from "../../ui/createActiveSquadView.js";
import { createClosedSquadView } from "../../ui/createClosedSquadView.js";
import { createQueueView } from "../../ui/createQueueView.js";
import { createReadyCheckView } from "../../ui/createReadyCheckView.js";
import { createResultVerificationView } from "../../ui/createResultVerificationView.js";

const button: Button = {
  customId: CustomIds.buttons.mainMenu.queue,

  async execute(client, interaction): Promise<void> {
    if (!interaction.guildId) {
      return;
    }

    const activeSquad =
      await client.services.teamFormation.getActiveSquadForPlayer(
        interaction.guildId,
        interaction.user.id,
      );

    if (activeSquad) {
      const squadView =
        activeSquad.status === "active"
          ? createActiveSquadView(activeSquad)
          : activeSquad.status === "result_pending"
            ? createResultVerificationView(activeSquad)
            : createReadyCheckView(activeSquad);

      await interaction.update({
        components: [squadView],
      });

      if (activeSquad.status === "ready_check") {
        client.services.readyCheckExpiration.schedule(
          activeSquad,
          interaction.message.id,
          async (expiredSquad) => {
            await interaction.editReply({
              components: [createClosedSquadView(expiredSquad)],
            });
          },
        );
      }

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
