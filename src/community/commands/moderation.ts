import {
  ChannelType,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";

import { GuildBlueprint } from "../../config/guildBlueprint.js";
import {
  CommunityTimeoutDurations,
  formatCommunityCaseReference,
  formatCommunityReportReference,
  type CommunityTimeoutDurationKey,
} from "../../constants/communityModeration.js";
import { createAlertView } from "../../ui/createAlertView.js";
import type { CommunityClient } from "../CommunityClient.js";
import type { MemberModerationAction } from "../services/CommunityModerationService.js";
import { createCommunityModerationHistoryView } from "../ui/createCommunityModerationHistoryView.js";
import { createCommunityReportsView } from "../ui/createCommunityReportsView.js";
import { CommunityModerationError } from "../errors/CommunityModerationError.js";

const ephemeralFlags = MessageFlags.Ephemeral | MessageFlags.IsComponentsV2;

export const moderateCommandData = new SlashCommandBuilder()
  .setName("moderate")
  .setDescription("Apply a recorded Community moderation action")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((option) =>
    option
      .setName("member")
      .setDescription("Member to moderate")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("action")
      .setDescription("Moderation action")
      .setRequired(true)
      .addChoices(
        { name: "Warning", value: "warning" },
        { name: "Timeout", value: "timeout" },
        { name: "Remove timeout", value: "timeout_removed" },
        { name: "Kick (confirmation required)", value: "kick" },
        { name: "Ban (confirmation required)", value: "ban" },
      ),
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("Clear reason shown in the audit record")
      .setMinLength(3)
      .setMaxLength(500)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("duration")
      .setDescription("Required for a timeout")
      .addChoices(
        { name: "10 minutes", value: "10m" },
        { name: "1 hour", value: "1h" },
        { name: "24 hours", value: "24h" },
        { name: "7 days", value: "7d" },
      ),
  );

export const moderationHistoryCommandData = new SlashCommandBuilder()
  .setName("mod-history")
  .setDescription("View a member's retained Community moderation history")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption((option) =>
    option
      .setName("member")
      .setDescription("Member to inspect")
      .setRequired(true),
  );

export const revokeCaseCommandData = new SlashCommandBuilder()
  .setName("revoke-case")
  .setDescription("Reverse a reversible Community moderation case")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addIntegerOption((option) =>
    option
      .setName("case")
      .setDescription("Numeric VORA case number")
      .setMinValue(1)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("Reason for reversing the action")
      .setMinLength(3)
      .setMaxLength(500)
      .setRequired(true),
  );

export const reportsCommandData = new SlashCommandBuilder()
  .setName("reports")
  .setDescription("Open the Community report inbox")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export const resolveReportCommandData = new SlashCommandBuilder()
  .setName("resolve-report")
  .setDescription("Resolve a Community report with a recorded decision")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addIntegerOption((option) =>
    option
      .setName("report")
      .setDescription("Numeric REPORT number")
      .setMinValue(1)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("decision")
      .setDescription("Decision or moderation action")
      .setRequired(true)
      .addChoices(
        { name: "Dismiss report", value: "dismiss" },
        { name: "Warning", value: "warning" },
        { name: "Timeout", value: "timeout" },
        { name: "Kick", value: "kick" },
        { name: "Ban", value: "ban" },
      ),
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("Decision reason")
      .setMinLength(3)
      .setMaxLength(500)
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("duration")
      .setDescription("Required for a timeout")
      .addChoices(
        { name: "10 minutes", value: "10m" },
        { name: "1 hour", value: "1h" },
        { name: "24 hours", value: "24h" },
        { name: "7 days", value: "7d" },
      ),
  );

export const purgeCommandData = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Bulk-delete recent messages and create an audit case")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("Messages to inspect (1-100)")
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName("member")
      .setDescription("Only remove messages from this member"),
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("Audit reason")
      .setMinLength(3)
      .setMaxLength(500),
  );

export const channelControlCommandData = new SlashCommandBuilder()
  .setName("channel-control")
  .setDescription("Lock, unlock or set slowmode on a managed chat channel")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addStringOption((option) =>
    option
      .setName("action")
      .setDescription("Safe channel action")
      .setRequired(true)
      .addChoices(
        { name: "Lock channel", value: "lock" },
        { name: "Unlock channel", value: "unlock" },
        { name: "Set slowmode", value: "slowmode" },
      ),
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("Audit reason")
      .setMinLength(3)
      .setMaxLength(500)
      .setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName("seconds")
      .setDescription("Slowmode seconds (0 disables)")
      .setMinValue(0)
      .setMaxValue(21_600),
  );

function timeoutDuration(
  interaction: ChatInputCommandInteraction,
  action: string,
): number | null {
  const key = interaction.options.getString(
    "duration",
  ) as CommunityTimeoutDurationKey | null;

  if (action === "timeout" && !key) {
    throw new CommunityModerationError("Select a timeout duration.");
  }

  return key ? CommunityTimeoutDurations[key] : null;
}

async function actor(
  interaction: ChatInputCommandInteraction,
): Promise<GuildMember> {
  if (!interaction.inCachedGuild()) {
    throw new CommunityModerationError(
      "This command is only available in a server.",
    );
  }
  return interaction.member;
}

export async function executeModerationCommand(
  client: CommunityClient,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const action = interaction.options.getString(
    "action",
    true,
  ) as MemberModerationAction;
  const moderationCase = await client.moderation.requestMemberAction({
    guild: interaction.guild,
    actor: await actor(interaction),
    targetDiscordId: interaction.options.getUser("member", true).id,
    action,
    reason: interaction.options.getString("reason", true),
    durationMs: timeoutDuration(interaction, action),
  });
  await interaction.reply({
    components: [
      createAlertView(
        moderationCase.status === "pending" ? "warning" : "success",
        moderationCase.status === "pending"
          ? "Confirmation Required"
          : "Moderation Applied",
        `${formatCommunityCaseReference(moderationCase.caseNumber)} is ${moderationCase.status}. ${moderationCase.status === "pending" ? "Confirm it in the moderation log." : "The action and evidence were recorded."}`,
      ),
    ],
    flags: ephemeralFlags,
  });
}

export async function executeModerationHistoryCommand(
  client: CommunityClient,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const targetId = interaction.options.getUser("member", true).id;
  const history = await client.moderation.getHistory(
    interaction.guildId,
    targetId,
  );
  await interaction.reply({
    components: [createCommunityModerationHistoryView(targetId, history)],
    flags: ephemeralFlags,
  });
}

export async function executeRevokeCaseCommand(
  client: CommunityClient,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const result = await client.moderation.reverseCase(
    interaction.guild,
    await actor(interaction),
    interaction.options.getInteger("case", true),
    interaction.options.getString("reason", true),
  );
  await interaction.reply({
    components: [
      createAlertView(
        "success",
        "Case Reversed",
        `${formatCommunityCaseReference(result.caseNumber)} was reversed and recorded.`,
      ),
    ],
    flags: ephemeralFlags,
  });
}

export async function executeReportsCommand(
  client: CommunityClient,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const reports = await client.reports.getInbox(interaction.guildId);
  await interaction.reply({
    components: [createCommunityReportsView(reports)],
    flags: ephemeralFlags,
  });
}

export async function executeResolveReportCommand(
  client: CommunityClient,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  const reportNumber = interaction.options.getInteger("report", true);
  const decision = interaction.options.getString("decision", true);
  const reason = interaction.options.getString("reason", true);
  const staff = await actor(interaction);

  if (decision === "dismiss") {
    await client.reports.dismiss(
      interaction.guild,
      staff,
      reportNumber,
      reason,
    );
    await interaction.reply({
      components: [
        createAlertView(
          "success",
          "Report Dismissed",
          `${formatCommunityReportReference(reportNumber)} was reviewed and dismissed.`,
        ),
      ],
      flags: ephemeralFlags,
    });
    return;
  }

  const report = await client.reports.getOpenByNumber(
    interaction.guildId,
    reportNumber,
  );
  const moderationCase = await client.moderation.requestMemberAction({
    guild: interaction.guild,
    actor: staff,
    targetDiscordId: report.targetDiscordId,
    action: decision as MemberModerationAction,
    reason,
    durationMs: timeoutDuration(interaction, decision),
    source: "report",
    relatedReportId: report.id,
    channelId: report.evidence.channelId,
    messageId: report.evidence.messageId,
  });
  await interaction.reply({
    components: [
      createAlertView(
        moderationCase.status === "pending" ? "warning" : "success",
        "Report Decision Recorded",
        `${formatCommunityReportReference(reportNumber)} is linked to ${formatCommunityCaseReference(moderationCase.caseNumber)} (${moderationCase.status}).`,
      ),
    ],
    flags: ephemeralFlags,
  });
}

export async function executePurgeCommand(
  client: CommunityClient,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (
    !interaction.inCachedGuild() ||
    interaction.channel?.type !== ChannelType.GuildText
  )
    return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const amount = interaction.options.getInteger("amount", true);
  const target = interaction.options.getUser("member");
  const messages = await interaction.channel.messages.fetch({ limit: amount });
  const selected = target
    ? messages.filter((message) => message.author.id === target.id)
    : messages;
  const deleted = await interaction.channel.bulkDelete(selected, true);
  const reason =
    interaction.options.getString("reason") ?? "Staff message cleanup";
  const moderationCase = await client.moderation.recordChannelAction({
    guild: interaction.guild,
    actorDiscordId: interaction.user.id,
    action: "purge",
    reason,
    channelId: interaction.channelId,
    targetDiscordId: target?.id ?? null,
    details: { messageCount: deleted.size },
  });
  await interaction.editReply(
    `Deleted ${deleted.size} recent message(s). ${formatCommunityCaseReference(moderationCase.caseNumber)} recorded.`,
  );
}

export async function executeChannelControlCommand(
  client: CommunityClient,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (
    !interaction.inCachedGuild() ||
    interaction.channel?.type !== ChannelType.GuildText
  )
    return;
  const blueprint = GuildBlueprint.channels.find(
    (candidate) =>
      candidate.name === interaction.channel!.name &&
      GuildBlueprint.categories.find(
        (category) => category.key === candidate.categoryKey,
      )?.name === interaction.channel!.parent?.name,
  );
  if (
    !blueprint ||
    (blueprint.access !== "publicChat" && blueprint.access !== "verifiedChat")
  ) {
    throw new CommunityModerationError(
      "Channel control is limited to managed Vora chat channels.",
    );
  }
  const action = interaction.options.getString("action", true);
  const reason = interaction.options.getString("reason", true);
  let caseAction: "channel_lock" | "channel_unlock" | "slowmode";
  let seconds: number | undefined;
  if (action === "lock") {
    await interaction.channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { SendMessages: false },
      { reason },
    );
    caseAction = "channel_lock";
  } else if (action === "unlock") {
    await interaction.channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { SendMessages: blueprint.access === "publicChat" },
      { reason },
    );
    const verifiedName = GuildBlueprint.roles.find(
      (role) => role.key === "verifiedPlayer",
    )!.name;
    const verifiedRole = interaction.guild.roles.cache.find(
      (role) => role.name === verifiedName,
    );
    if (verifiedRole) {
      await interaction.channel.permissionOverwrites.edit(
        verifiedRole,
        { SendMessages: blueprint.access === "verifiedChat" ? true : null },
        { reason },
      );
    }
    caseAction = "channel_unlock";
  } else {
    seconds = interaction.options.getInteger("seconds") ?? 0;
    await interaction.channel.setRateLimitPerUser(seconds, reason);
    caseAction = "slowmode";
  }
  const moderationCase = await client.moderation.recordChannelAction({
    guild: interaction.guild,
    actorDiscordId: interaction.user.id,
    action: caseAction,
    reason,
    channelId: interaction.channelId,
    details: { slowmodeSeconds: seconds },
  });
  await interaction.reply({
    components: [
      createAlertView(
        "success",
        "Channel Updated",
        `${interaction.channel} was updated. ${formatCommunityCaseReference(moderationCase.caseNumber)} recorded.`,
      ),
    ],
    flags: ephemeralFlags,
  });
}
