import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import { createAlertView } from "../../ui/createAlertView.js";
import type { CommunityClient } from "../CommunityClient.js";
import { createVerificationWorklistView } from "../ui/createVerificationWorklistView.js";

export const VerificationInboxCommandName = "verification-inbox";

export const verificationInboxCommandData = new SlashCommandBuilder()
  .setName(VerificationInboxCommandName)
  .setDescription("Review every unverified player and missing review artifact")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function executeVerificationInboxCommand(
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
          "You need the Moderate Members permission to inspect account verification.",
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
        "Auditing Verification",
        "Vora is checking player profiles, open requests and private review evidence.",
      ),
    ],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });

  const worklist = await client.onboarding.getVerificationWorklist(
    interaction.guild,
  );

  await interaction.editReply({
    components: [createVerificationWorklistView(interaction.guildId, worklist)],
  });
}
