import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../interfaces/Command.js";
import { createAlertView } from "../ui/createAlertView.js";
import { createModerationAuditView } from "../ui/createModerationAuditView.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("audit-log")
    .setDescription("Review immutable Vora moderation records")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("player")
        .setDescription("Show records affecting one player")
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
            "You need the Moderate Members permission to review moderation records.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    const player = interaction.options.getUser("player");
    const events = await client.services.moderationAudit.getRecent(
      interaction.guildId,
      player?.id,
    );

    await interaction.reply({
      components: [createModerationAuditView(events, player?.id)],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
