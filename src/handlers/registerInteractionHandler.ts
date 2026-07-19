import {
  Events,
  MessageFlags,
  type Interaction,
} from "discord.js";

import type { RecallClient } from "../client/RecallClient.js";
import { logger } from "../config/logger.js";
import { formatError } from "../utils/formatError.js";

const genericErrorResponse = {
  content:
    "An unexpected error occurred while processing this interaction.",
  flags: MessageFlags.Ephemeral,
} as const;

async function respondWithError(
  interaction: Interaction,
): Promise<void> {
  if (!interaction.isRepliable()) {
    return;
  }

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(genericErrorResponse);
    return;
  }

  await interaction.reply(genericErrorResponse);
}

export function registerInteractionHandler(
  client: RecallClient,
): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(
          interaction.commandName,
        );

        if (!command) {
          logger.warn(
            `Received unknown command: /${interaction.commandName}`,
          );

          await interaction.reply({
            content:
              "This command is currently unavailable. Please try again later.",
            flags: MessageFlags.Ephemeral,
          });

          return;
        }

        await command.execute(client, interaction);
        return;
      }

      if (interaction.isButton()) {
        const button = client.buttons.get(interaction.customId);

        if (!button) {
          logger.warn(
            `Received unknown button: ${interaction.customId}`,
          );

          await interaction.reply({
            content:
              "This button is no longer available. Please open the menu again.",
            flags: MessageFlags.Ephemeral,
          });

          return;
        }

        await button.execute(client, interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        const modal = client.modals.get(interaction.customId);

        if (!modal) {
          logger.warn(
            `Received unknown modal: ${interaction.customId}`,
          );

          await interaction.reply({
            content:
              "This form is no longer available. Please open it again.",
            flags: MessageFlags.Ephemeral,
          });

          return;
        }

        await modal.execute(client, interaction);
      }
    } catch (error: unknown) {
      logger.error(
        `Interaction ${interaction.id} failed:\n${formatError(error)}`,
      );

      await respondWithError(interaction);
    }
  });
}