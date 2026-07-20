import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../interfaces/Command.js";
import type { IntegritySanctionAction } from "../constants/integrity.js";
import type { DisputeResolutionAction } from "../services/DisputeModerationService.js";
import { InvalidDisputeReferenceError } from "../services/errors/InvalidDisputeReferenceError.js";
import { createAlertView } from "../ui/createAlertView.js";
import { createDisputeResolutionView } from "../ui/createDisputeResolutionView.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("resolve-dispute")
    .setDescription("Resolve a disputed Vora match result")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((option) =>
      option
        .setName("squad-id")
        .setDescription("The full squad reference from the dispute inbox")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("decision")
        .setDescription("The final moderation decision")
        .setRequired(true)
        .addChoices(
          { name: "Confirm reported result", value: "uphold" },
          { name: "Set final result to Victory", value: "victory" },
          { name: "Set final result to Defeat", value: "defeat" },
          { name: "Void match", value: "void" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("sanction")
        .setDescription("Action against the player who submitted the result")
        .setRequired(true)
        .addChoices(
          { name: "No player sanction", value: "none" },
          { name: "Misleading evidence", value: "misleading_evidence" },
          { name: "Deliberate result fraud", value: "deliberate_fraud" },
        ),
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
            "You need the Moderate Members permission to resolve disputed results.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });

    try {
      const squad = await client.services.disputeModeration.resolve(
        interaction.guildId,
        interaction.options.getString("squad-id", true),
        interaction.user.id,
        interaction.options.getString(
          "decision",
          true,
        ) as DisputeResolutionAction,
        interaction.options.getString(
          "sanction",
          true,
        ) as IntegritySanctionAction,
      );

      await interaction.editReply({
        components: [createDisputeResolutionView(squad)],
      });
    } catch (error: unknown) {
      if (error instanceof InvalidDisputeReferenceError) {
        await interaction.editReply({
          components: [
            createAlertView(
              "warning",
              "Dispute Unavailable",
              "This dispute does not exist, belongs to another server, or was already resolved.",
            ),
          ],
        });
        return;
      }

      throw error;
    }
  },
};

export default command;
