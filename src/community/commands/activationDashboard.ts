import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import { createAlertView } from "../../ui/createAlertView.js";
import type { CommunityClient } from "../CommunityClient.js";
import { createActivationDashboardView } from "../ui/createQueueActivationView.js";

export const ActivationDashboardCommandName = "activation-dashboard";

export const activationDashboardCommandData = new SlashCommandBuilder()
  .setName(ActivationDashboardCommandName)
  .setDescription("Review onboarding conversion and recent squad activity")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function executeActivationDashboardCommand(
  client: CommunityClient,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) {
    return;
  }

  if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({
      components: [
        createAlertView(
          "warning",
          "Operations Access Required",
          "You need the Moderate Members permission to inspect activation data.",
        ),
      ],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
    return;
  }

  await interaction.reply({
    components: [
      createAlertView(
        "information",
        "Loading Activation Data",
        "Vora is calculating the current player funnel and recent squad activity.",
      ),
    ],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });

  const onboarding = await client.onboarding.getSnapshot(interaction.guild);
  const metrics = await client.activation.getMetrics(interaction.guild);

  await interaction.editReply({
    components: [createActivationDashboardView(onboarding, metrics)],
  });
}
