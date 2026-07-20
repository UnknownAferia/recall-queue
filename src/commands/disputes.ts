import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../interfaces/Command.js";
import { InvalidDisputeReferenceError } from "../services/errors/InvalidDisputeReferenceError.js";
import { createAlertView } from "../ui/createAlertView.js";
import { createDisputeInboxView } from "../ui/createDisputeInboxView.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("disputes")
    .setDescription("Review disputed Vora match results")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((option) =>
      option
        .setName("squad-id")
        .setDescription("Show one disputed squad by its full reference")
        .setRequired(false),
    ),

  async execute(client, interaction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      return;
    }

    if (
      !interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)
    ) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Staff Access Required",
            "You need the Moderate Members permission to review disputed results.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    try {
      const squads = await client.services.disputeModeration.getInbox(
        interaction.guildId,
        interaction.options.getString("squad-id") ?? undefined,
      );

      await interaction.reply({
        components: [createDisputeInboxView(squads)],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    } catch (error: unknown) {
      if (error instanceof InvalidDisputeReferenceError) {
        await interaction.reply({
          components: [
            createAlertView("warning", "Dispute Not Found", error.message),
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }

      throw error;
    }
  },
};

export default command;
