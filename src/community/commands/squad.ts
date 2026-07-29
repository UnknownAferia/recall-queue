import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import { createAlertView } from "../../ui/createAlertView.js";
import type { CommunityClient } from "../CommunityClient.js";
import {
  createCommunitySquadDashboardView,
  createCommunitySquadWelcomeView,
  createFoundingApplicationsView,
} from "../ui/createCommunitySquadView.js";

export const CommunitySquadCommandName = "squad";
export const CommunitySquadAdminCommandName = "squad-admin";

export const communitySquadCommandData = new SlashCommandBuilder()
  .setName(CommunitySquadCommandName)
  .setDescription("Create, join and manage your persistent Vora Squad")
  .setContexts(InteractionContextType.Guild);

export const communitySquadAdminCommandData = new SlashCommandBuilder()
  .setName(CommunitySquadAdminCommandName)
  .setDescription("Review Vora Founding Squad applications")
  .setContexts(InteractionContextType.Guild)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((command) =>
    command
      .setName("applications")
      .setDescription("List pending Founding Squad applications"),
  )
  .addSubcommand((command) =>
    command
      .setName("approve")
      .setDescription("Approve a Founding Squad application")
      .addStringOption((option) =>
        option
          .setName("code")
          .setDescription("Squad code shown in the application list")
          .setRequired(true),
      ),
  )
  .addSubcommand((command) =>
    command
      .setName("reject")
      .setDescription("Return a Founding Squad application for changes")
      .addStringOption((option) =>
        option
          .setName("code")
          .setDescription("Squad code shown in the application list")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("Short private reason for the captain")
          .setMinLength(3)
          .setMaxLength(200)
          .setRequired(true),
      ),
  );

export async function executeCommunitySquadCommand(
  client: CommunityClient,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) {
    return;
  }
  const squad = await client.communitySquads.getDashboard(
    interaction.guildId,
    interaction.user.id,
  );
  await interaction.reply({
    components: [
      squad
        ? createCommunitySquadDashboardView(squad, interaction.user.id)
        : createCommunitySquadWelcomeView(),
    ],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });
}

export async function executeCommunitySquadAdminCommand(
  client: CommunityClient,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) {
    return;
  }
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      components: [
        createAlertView(
          "warning",
          "Operations Access Required",
          "You need Manage Server to review Founding Squad applications.",
        ),
      ],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand(true);
  if (subcommand === "applications") {
    const squads = await client.communitySquads.listFoundingApplications(
      interaction.guildId,
    );
    await interaction.reply({
      components: [createFoundingApplicationsView(squads)],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
    return;
  }

  const approved = subcommand === "approve";
  const squad = await client.communitySquads.reviewFoundingApplication(
    interaction.guildId,
    interaction.options.getString("code", true),
    approved ? "founding" : "rejected",
    interaction.user.id,
    approved ? null : interaction.options.getString("reason", true),
  );
  await interaction.reply({
    components: [
      createAlertView(
        approved ? "success" : "information",
        approved ? "Founding Squad Approved" : "Application Returned",
        `**[${squad.tag}] ${squad.name}** is now marked as ${approved ? "a Founding Squad" : "requiring changes"}.`,
      ),
    ],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });
}
