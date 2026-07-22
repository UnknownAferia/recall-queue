import { MessageFlags, PermissionFlagsBits } from "discord.js";

import {
  CustomIds,
  parsePlayerAdministrationOperationCustomId,
} from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { PlayerAdministrationError } from "../../services/errors/PlayerAdministrationError.js";
import { createAlertView } from "../../ui/createAlertView.js";
import { createPlayerAdministrationOutcomeView } from "../../ui/createPlayerAdministrationView.js";

const button: Button = {
  customId: CustomIds.buttons.playerAdministration.route,
  matches: (customId) =>
    parsePlayerAdministrationOperationCustomId(customId) !== null,

  async execute(client, interaction): Promise<void> {
    const parsed = parsePlayerAdministrationOperationCustomId(
      interaction.customId,
    );

    if (!parsed || !interaction.inCachedGuild()) {
      return;
    }

    const requiredPermission =
      parsed.action === "unregister"
        ? PermissionFlagsBits.Administrator
        : PermissionFlagsBits.ModerateMembers;

    if (!interaction.memberPermissions.has(requiredPermission)) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Staff Access Required",
            parsed.action === "unregister"
              ? "Administrator permission is required to confirm profile removal."
              : "Moderate Members permission is required to confirm this reset.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      if (parsed.decision === "cancel") {
        const cancelled = await client.services.playerAdministration.cancel(
          parsed.operationId,
          interaction.guildId,
          interaction.user.id,
        );
        await interaction.editReply({
          components: [createPlayerAdministrationOutcomeView(cancelled)],
        });
        return;
      }

      const execution = await client.services.playerAdministration.execute(
        parsed.operationId,
        interaction.guildId,
        interaction.user.id,
      );

      if (execution.operation.status !== "completed") {
        await interaction.editReply({
          components: [
            createPlayerAdministrationOutcomeView(execution.operation),
          ],
        });
        return;
      }

      let managedRolesRemoved = 0;
      for (const guild of client.guilds.cache.values()) {
        const member = await guild.members
          .fetch(execution.operation.targetDiscordId)
          .catch(() => null);

        if (member) {
          managedRolesRemoved +=
            await client.services.guildAccess.removeManagedPlayerRoles(
              member,
              execution.operation.action === "unregister",
            );
        }
      }

      let evidenceMessagesRemoved = 0;
      for (const evidence of execution.evidence) {
        for (const guild of client.guilds.cache.values()) {
          const channel = await guild.channels
            .fetch(evidence.archiveChannelId)
            .catch(() => null);

          if (!channel) {
            continue;
          }

          if (
            await client.services.playerVerificationEvidence.discard(
              guild,
              evidence,
            )
          ) {
            evidenceMessagesRemoved += 1;
          }
          break;
        }
      }

      await client.services.playerAdministration.recordExternalCleanup(
        execution.operation.id,
        managedRolesRemoved,
        evidenceMessagesRemoved,
      );

      await interaction.editReply({
        components: [
          createPlayerAdministrationOutcomeView(
            execution.operation,
            managedRolesRemoved,
            evidenceMessagesRemoved,
          ),
        ],
      });
    } catch (error: unknown) {
      if (error instanceof PlayerAdministrationError) {
        await interaction.editReply({
          components: [
            createAlertView(
              "warning",
              "Player Action Rejected",
              error.message,
            ),
          ],
        });
        return;
      }

      throw error;
    }
  },
};

export default button;
