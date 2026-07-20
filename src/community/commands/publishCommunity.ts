import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import { createAlertView } from "../../ui/createAlertView.js";
import type { CommunityClient } from "../CommunityClient.js";

export const PublishCommunityCommandName = "publish-community";

export const publishCommunityCommandData = new SlashCommandBuilder()
  .setName(PublishCommunityCommandName)
  .setDescription("Publish or refresh Vora's managed community information")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function executePublishCommunityCommand(
  client: CommunityClient,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) {
    return;
  }

  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      components: [
        createAlertView(
          "warning",
          "Administrator Required",
          "Only server administrators can publish Vora's managed community content.",
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
        "Publishing Community Content",
        "Vora Community is updating the managed information channels.",
      ),
    ],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });

  const result = await client.panels.synchronizeStaticPanels(interaction.guild);
  const missing = result.missingChannelKeys;

  await interaction.editReply({
    components: [
      createAlertView(
        missing.length === 0 ? "success" : "warning",
        missing.length === 0
          ? "Community Content Published"
          : "Community Content Incomplete",
        [
          `${result.published.length} managed panel(s) were published or refreshed.`,
          missing.length > 0
            ? `Missing managed channels: ${missing.map((key) => `\`${key}\``).join(", ")}. Run \`/server-setup\` with Vora Core, then try again.`
            : "Welcome, rules, announcements, platform guidance and support panels are now up to date.",
        ].join("\n\n"),
      ),
    ],
  });
}
