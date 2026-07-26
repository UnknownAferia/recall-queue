import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import { createAlertView } from "../../ui/createAlertView.js";
import type { CommunityClient } from "../CommunityClient.js";

export const PublishAnnouncementCommandName = "publish-announcement";

export const publishAnnouncementCommandData = new SlashCommandBuilder()
  .setName(PublishAnnouncementCommandName)
  .setDescription("Publish or refresh Vora's official release announcement")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function executePublishAnnouncementCommand(
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
          "Only server administrators can publish official Vora announcements.",
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
        "Publishing Announcement",
        "Vora Community is preparing the official release post.",
      ),
    ],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });

  const result = await client.panels.publishLaunchAnnouncement(
    interaction.guild,
  );

  await interaction.editReply({
    components: [
      result
        ? createAlertView(
            "success",
            "Announcement Published",
            `The official release announcement was published or refreshed in <#${result.channelId}>. Reusing this command updates the same post.`,
          )
        : createAlertView(
            "warning",
            "Announcements Channel Missing",
            "Run `/server-setup` with Vora Core, then try again.",
          ),
    ],
  });
}
