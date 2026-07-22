import { MessageFlags } from "discord.js";

import { CustomIds } from "../../constants/customIds.js";
import { QueueConfig } from "../../constants/queue.js";
import type { Button } from "../../interfaces/Button.js";
import { PlayerAlreadyInActiveSquadError } from "../../services/errors/PlayerAlreadyInActiveSquadError.js";
import { PlayerAlreadyInQueueError } from "../../services/errors/PlayerAlreadyInQueueError.js";
import { PlayerRegistrationRequiredError } from "../../services/errors/PlayerRegistrationRequiredError.js";
import { QueueAccessSuspendedError } from "../../services/errors/QueueAccessSuspendedError.js";
import { QueueFullError } from "../../services/errors/QueueFullError.js";
import { QueueLockedError } from "../../services/errors/QueueLockedError.js";
import { RolePreferencesRequiredError } from "../../services/errors/RolePreferencesRequiredError.js";
import { PlayerVerificationRequiredError } from "../../services/errors/PlayerVerificationRequiredError.js";
import { createAlertView } from "../../ui/createAlertView.js";
import { createClosedSquadView } from "../../ui/createClosedSquadView.js";
import { createQueueView } from "../../ui/createQueueView.js";
import { createReadyCheckView } from "../../ui/createReadyCheckView.js";

const button: Button = {
  customId: CustomIds.buttons.queue.join,

  async execute(client, interaction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      return;
    }

    const voiceEligibility = client.services.queueVoice.getEligibility(
      interaction.member,
    );

    if (!voiceEligibility.eligible) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Queue Voice Required",
            voiceEligibility.message ??
              "Join the managed queue voice channel before entering matchmaking.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const queue = await client.services.queue.joinQueue(
        interaction.guildId,
        interaction.user.id,
      );

      const squad =
        queue.entries.length >= QueueConfig.teamSize
          ? await client.services.teamFormation.tryCreateSquadFromQueue(
              interaction.guildId,
            )
          : null;

      const visibleQueue = squad
        ? await client.services.queue.getQueue(interaction.guildId)
        : queue;

      await interaction.editReply({
        components: [createQueueView(visibleQueue, interaction.user.id)],
      });

      if (squad) {
        const participantIds = squad.participants.map(
          (participant) => participant.discordId,
        );

        try {
          const readyCheckMessage = await interaction.followUp({
            components: [createReadyCheckView(squad)],
            allowedMentions: {
              users: participantIds,
            },
            flags: MessageFlags.IsComponentsV2,
          });

          client.services.readyCheckExpiration.schedule(
            squad,
            readyCheckMessage.id,
            async (expiredSquad) => {
              await readyCheckMessage.edit({
                components: [createClosedSquadView(expiredSquad)],
              });
            },
          );
        } catch (error: unknown) {
          await client.services.teamFormation.cancelReadyCheck(squad.id);

          throw error;
        }
      }
    } catch (error: unknown) {
      if (error instanceof QueueAccessSuspendedError) {
        const expirationTimestamp = Math.floor(
          error.bannedUntil.getTime() / 1_000,
        );

        const queue = await client.services.queue.getQueue(interaction.guildId);

        await interaction.editReply({
          components: [
            createQueueView(queue, interaction.user.id, error.bannedUntil),
          ],
        });

        await interaction.followUp({
          components: [
            createAlertView(
              "warning",
              "Matchmaking Access Suspended",
              `You can join the queue again <t:${expirationTimestamp}:R>.`,
            ),
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });

        return;
      }

      if (
        error instanceof PlayerAlreadyInActiveSquadError ||
        error instanceof PlayerAlreadyInQueueError ||
        error instanceof PlayerRegistrationRequiredError ||
        error instanceof PlayerVerificationRequiredError ||
        error instanceof RolePreferencesRequiredError ||
        error instanceof QueueFullError ||
        error instanceof QueueLockedError
      ) {
        await interaction.followUp({
          components: [
            createAlertView("warning", "Unable to Join Queue", error.message),
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
