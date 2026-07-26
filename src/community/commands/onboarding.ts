import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import { createAlertView } from "../../ui/createAlertView.js";
import type { CommunityClient } from "../CommunityClient.js";
import { createOnboardingDashboardView } from "../ui/createOnboardingDashboardView.js";

export const OnboardingCommandName = "onboarding";

export const onboardingCommandData = new SlashCommandBuilder()
  .setName(OnboardingCommandName)
  .setDescription("Review Vora player onboarding and private reminders")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function executeOnboardingCommand(
  client: CommunityClient,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) {
    return;
  }

  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({
      components: [
        createAlertView(
          "warning",
          "Operations Access Required",
          "Only Vora Operations members with Manage Messages can review onboarding.",
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
        "Loading Onboarding",
        "Vora Community is reviewing registration and verification progress.",
      ),
    ],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });

  const snapshot = await client.onboarding.getSnapshot(interaction.guild);

  await interaction.editReply({
    components: [createOnboardingDashboardView(snapshot)],
  });
}
