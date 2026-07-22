import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../interfaces/Command.js";
import type { MaintenanceScope } from "../types/operations.js";
import { createAlertView } from "../ui/createAlertView.js";
import {
  createLaunchAuditView,
  createMaintenanceView,
  createRecoveryView,
  createSystemStatusView,
} from "../ui/createSystemOperationsView.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("system-admin")
    .setDescription("Inspect and control Vora's production services")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand.setName("status").setDescription("Inspect live service and lifecycle health"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("maintenance")
        .setDescription("Open or close registration and matchmaking")
        .addStringOption((option) =>
          option
            .setName("scope")
            .setDescription("Area controlled by this change")
            .setRequired(true)
            .addChoices(
              { name: "All player services", value: "all" },
              { name: "Registration", value: "registration" },
              { name: "Matchmaking", value: "matchmaking" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("access")
            .setDescription("New access state")
            .setRequired(true)
            .addChoices(
              { name: "Open", value: "open" },
              { name: "Maintenance", value: "closed" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Operational reason recorded in the audit trail")
            .setRequired(true)
            .setMinLength(5)
            .setMaxLength(500),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("reconcile").setDescription("Recover queues, lifecycle timers and squad voice state"),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("launch-audit").setDescription("Run the automated private-alpha readiness audit"),
    ),

  async execute(client, interaction): Promise<void> {
    if (!interaction.inCachedGuild() || interaction.guild.ownerId !== interaction.user.id) {
      await interaction.reply({
        components: [createAlertView("warning", "Server Owner Required", "Only the Discord server owner can control Vora's production state.")],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "status") {
      await interaction.reply({
        components: [createSystemStatusView(await client.services.systemOperations.getStatus())],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    await interaction.reply({
      components: [createAlertView("information", "Operation in Progress", "Vora is validating and reconciling production state.")],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });

    if (subcommand === "maintenance") {
      const scope = interaction.options.getString("scope", true) as MaintenanceScope;
      const open = interaction.options.getString("access", true) === "open";
      const state = await client.services.operationalControl.setAccess(
        scope,
        open,
        interaction.user.id,
        interaction.options.getString("reason", true),
      );
      await client.services.systemOperations.recordOperation(
        interaction.guildId,
        interaction.user.id,
        "maintenance_changed",
        {
          scope,
          open,
          reason: interaction.options.getString("reason", true),
        },
      );
      await interaction.editReply({ components: [createMaintenanceView(state)] });
      return;
    }

    if (subcommand === "reconcile") {
      const summary = await client.services.systemOperations.recover(client);
      await client.services.systemOperations.recordOperation(
        interaction.guildId,
        interaction.user.id,
        "system_recovery_run",
        {
          expiredReadyChecks: summary.expiredReadyChecks,
          expiredResultCases: summary.expiredResultCases,
          staleQueueEntries: summary.staleQueueEntries,
          warnings: summary.warnings.length,
        },
      );
      await interaction.editReply({ components: [createRecoveryView(summary)] });
      if (summary.warnings.length) {
        await client.services.systemOperations.publishCriticalAlert(
          interaction.guild,
          "Recovery Completed with Warnings",
          summary.warnings.join("\n"),
        );
      }
      return;
    }

    const audit = await client.services.systemOperations.audit(client);
    await client.services.systemOperations.recordOperation(
      interaction.guildId,
      interaction.user.id,
      "launch_audit_run",
      {
        failures: audit.checks.filter((check) => check.level === "failure").length,
        warnings: audit.checks.filter((check) => check.level === "warning").length,
      },
    );
    await interaction.editReply({ components: [createLaunchAuditView(audit)] });
    const failures = audit.checks.filter((check) => check.level === "failure");
    if (failures.length) {
      await client.services.systemOperations.publishCriticalAlert(
        interaction.guild,
        "Alpha Launch Audit Failed",
        failures.map((check) => `${check.name}: ${check.detail}`).join("\n"),
      );
    }
  },
};

export default command;
