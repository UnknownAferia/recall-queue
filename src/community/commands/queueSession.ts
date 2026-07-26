import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import { QueueActivationConfig } from "../../constants/queueActivation.js";
import { createAlertView } from "../../ui/createAlertView.js";
import type { CommunityClient } from "../CommunityClient.js";
import { QueueActivationError } from "../errors/QueueActivationError.js";
import {
  createQueueSessionScheduledView,
  createUpcomingQueueSessionsView,
} from "../ui/createQueueActivationView.js";

export const QueueSessionCommandName = "queue-session";

export const queueSessionCommandData = new SlashCommandBuilder()
  .setName(QueueSessionCommandName)
  .setDescription("Schedule and manage Vora community queue sessions")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("schedule")
      .setDescription("Schedule a new community queue session")
      .addIntegerOption((option) =>
        option
          .setName("starts-in")
          .setDescription("Minutes from now until the session starts")
          .setMinValue(QueueActivationConfig.minimumSessionLeadMinutes)
          .setMaxValue(QueueActivationConfig.maximumSessionLeadMinutes)
          .setRequired(true),
      )
      .addIntegerOption((option) =>
        option
          .setName("duration")
          .setDescription("Session duration in minutes (default: 120)")
          .setMinValue(QueueActivationConfig.minimumSessionDurationMinutes)
          .setMaxValue(QueueActivationConfig.maximumSessionDurationMinutes),
      )
      .addStringOption((option) =>
        option
          .setName("title")
          .setDescription("Optional public session title")
          .setMinLength(3)
          .setMaxLength(80),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("cancel")
      .setDescription("Cancel a scheduled queue session")
      .addStringOption((option) =>
        option
          .setName("session")
          .setDescription("Full session reference from /queue-session list")
          .setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("list").setDescription("List upcoming queue sessions"),
  );

export async function executeQueueSessionCommand(
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
          "You need the Moderate Members permission to manage queue sessions.",
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
        "Updating Queue Sessions",
        "Vora Community is applying the requested schedule change.",
      ),
    ],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });

  try {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === "schedule") {
      const session = await client.activation.scheduleSession({
        guildId: interaction.guildId,
        title: interaction.options.getString("title") ?? undefined,
        startsInMinutes: interaction.options.getInteger("starts-in", true),
        durationMinutes:
          interaction.options.getInteger("duration") ?? undefined,
        createdByDiscordId: interaction.user.id,
      });
      await client.panels.synchronizeMatchmakingStatus(interaction.guild);
      await interaction.editReply({
        components: [createQueueSessionScheduledView(session)],
      });
      return;
    }

    if (subcommand === "cancel") {
      const session = await client.activation.cancelSession(
        interaction.guildId,
        interaction.options.getString("session", true),
        interaction.user.id,
      );
      await client.panels.synchronizeMatchmakingStatus(interaction.guild);
      await interaction.editReply({
        components: [
          createAlertView(
            "success",
            "Queue Session Cancelled",
            `**${session.title}** has been removed from the public schedule.`,
          ),
        ],
      });
      return;
    }

    const sessions = await client.activation.getUpcomingSessions(
      interaction.guildId,
    );
    await interaction.editReply({
      components: [createUpcomingQueueSessionsView(sessions)],
    });
  } catch (error: unknown) {
    if (error instanceof QueueActivationError) {
      await interaction.editReply({
        components: [
          createAlertView(
            "warning",
            "Queue Session Unavailable",
            error.message,
          ),
        ],
      });
      return;
    }

    throw error;
  }
}
