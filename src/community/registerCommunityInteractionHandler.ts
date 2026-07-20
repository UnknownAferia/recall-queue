import {
  ChannelType,
  Events,
  MessageFlags,
  type Interaction,
} from "discord.js";

import { CommunityCustomIds } from "../constants/community.js";
import { logger } from "../config/logger.js";
import { createAlertView } from "../ui/createAlertView.js";
import { formatError } from "../utils/formatError.js";
import type { CommunityClient } from "./CommunityClient.js";
import {
  executePublishCommunityCommand,
  PublishCommunityCommandName,
} from "./commands/publishCommunity.js";
import { TicketAlreadyOpenError } from "./errors/TicketAlreadyOpenError.js";
import { TicketOperationError } from "./errors/TicketOperationError.js";
import { createClosedTicketView } from "./ui/createClosedTicketView.js";
import { createTicketModal } from "./ui/createTicketModal.js";

function createErrorResponse(title: string, description: string) {
  return {
    components: [createAlertView("warning", title, description)],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  } as const;
}

async function respondWithError(
  interaction: Interaction,
  title: string,
  description: string,
): Promise<void> {
  if (!interaction.isRepliable()) {
    return;
  }

  const response = createErrorResponse(title, description);

  const replacesLoadingResponse =
    (interaction.isModalSubmit() &&
      interaction.customId === CommunityCustomIds.ticket.create) ||
    (interaction.isChatInputCommand() &&
      interaction.commandName === PublishCommunityCommandName);

  if (
    replacesLoadingResponse &&
    (interaction.replied || interaction.deferred)
  ) {
    await interaction.editReply({
      components: response.components,
    });
    return;
  }

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(response);
  } else {
    await interaction.reply(response);
  }
}

export function registerCommunityInteractionHandler(
  client: CommunityClient,
): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === PublishCommunityCommandName
      ) {
        await executePublishCommunityCommand(client, interaction);
        return;
      }

      if (
        interaction.isButton() &&
        interaction.customId === CommunityCustomIds.ticket.open
      ) {
        await interaction.showModal(createTicketModal());
        return;
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId === CommunityCustomIds.ticket.create
      ) {
        if (!interaction.inCachedGuild()) {
          return;
        }

        await interaction.reply({
          components: [
            createAlertView(
              "information",
              "Creating Ticket",
              "Vora Community is preparing your private support channel.",
            ),
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });

        const result = await client.tickets.open(
          interaction.guild,
          interaction.member,
          interaction.fields.getTextInputValue(
            CommunityCustomIds.ticket.subject,
          ),
          interaction.fields.getTextInputValue(
            CommunityCustomIds.ticket.description,
          ),
        );

        await interaction.editReply({
          components: [
            createAlertView(
              "success",
              "Ticket Opened",
              `Your private support channel is ready: <#${result.channel.id}>`,
            ),
          ],
        });
        return;
      }

      if (
        interaction.isButton() &&
        interaction.customId === CommunityCustomIds.ticket.close
      ) {
        if (
          !interaction.inCachedGuild() ||
          interaction.channel?.type !== ChannelType.GuildText
        ) {
          return;
        }

        await interaction.deferUpdate();

        const ticket = await client.tickets.close(
          interaction.guild,
          interaction.channel,
          interaction.member,
        );

        await interaction.editReply({
          components: [createClosedTicketView(ticket)],
        });
      }
    } catch (error: unknown) {
      if (
        error instanceof TicketAlreadyOpenError ||
        error instanceof TicketOperationError
      ) {
        await respondWithError(
          interaction,
          "Ticket Unavailable",
          error.message,
        );
        return;
      }

      logger.error(
        `Community interaction ${interaction.id} failed:\n${formatError(error)}`,
      );
      await respondWithError(
        interaction,
        "Interaction Failed",
        "An unexpected error occurred while processing this request.",
      );
    }
  });
}
