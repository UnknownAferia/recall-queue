import { Events, MessageFlags, type Interaction } from "discord.js";

import type { VoraClient } from "../client/VoraClient.js";
import { logger } from "../config/logger.js";
import { createAlertView } from "../ui/createAlertView.js";
import { formatError } from "../utils/formatError.js";

function createErrorResponse(title: string, description: string) {
  return {
    components: [createAlertView("error", title, description)],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  } as const;
}

export async function respondWithError(
  interaction: Interaction,
): Promise<void> {
  if (!interaction.isRepliable()) {
    return;
  }

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(
        createErrorResponse(
          "Interaction Failed",
          "An unexpected error occurred while processing this interaction.",
        ),
      );
      return;
    }

    await interaction.reply(
      createErrorResponse(
        "Interaction Failed",
        "An unexpected error occurred while processing this interaction.",
      ),
    );
  } catch (error: unknown) {
    logger.warn(
      `Unable to deliver Core error response for interaction ${interaction.id}:\n${formatError(error)}`,
    );
  }
}

export function registerInteractionHandler(client: VoraClient): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
          logger.warn(`Received unknown command: /${interaction.commandName}`);

          await interaction.reply({
            ...createErrorResponse(
              "Command Unavailable",
              "This command is currently unavailable. Please try again later.",
            ),
          });

          return;
        }

        await command.execute(client, interaction);
        return;
      }

      if (interaction.isButton()) {
        const button =
          client.buttons.get(interaction.customId) ??
          client.buttons.find((candidate) =>
            candidate.matches?.(interaction.customId),
          );

        if (!button) {
          logger.warn(`Received unknown button: ${interaction.customId}`);

          await interaction.reply({
            ...createErrorResponse(
              "Button Expired",
              "This button is no longer available. Please open the menu again.",
            ),
          });

          return;
        }

        await button.execute(client, interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        const selectMenu = client.stringSelectMenus.get(interaction.customId);

        if (!selectMenu) {
          logger.warn(
            `Received unknown string select menu: ${interaction.customId}`,
          );

          await interaction.reply({
            ...createErrorResponse(
              "Menu Expired",
              "This selection menu is no longer available. Please open the settings again.",
            ),
          });

          return;
        }

        await selectMenu.execute(client, interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        const modal =
          client.modals.get(interaction.customId) ??
          client.modals.find((candidate) =>
            candidate.matches?.(interaction.customId),
          );

        if (!modal) {
          logger.warn(`Received unknown modal: ${interaction.customId}`);

          await interaction.reply({
            ...createErrorResponse(
              "Form Expired",
              "This form is no longer available. Please open it again.",
            ),
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
