import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../interfaces/Command.js";
import { PlayerAdministrationError } from "../services/errors/PlayerAdministrationError.js";
import { createAlertView } from "../ui/createAlertView.js";
import {
  createPlayerAdministrationConfirmationView,
  createPlayerAdministrationInspectionView,
} from "../ui/createPlayerAdministrationView.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("player-admin")
    .setDescription("Inspect and safely manage Vora player profiles")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("inspect")
        .setDescription("Review a player's complete Vora lifecycle status")
        .addUserOption((option) =>
          option.setName("player").setDescription("Player to inspect").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reset-verification")
        .setDescription("Reset a stuck or incorrect account verification")
        .addUserOption((option) =>
          option.setName("player").setDescription("Player to reset").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("Staff audit reason").setRequired(true).setMinLength(10).setMaxLength(500),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("unregister")
        .setDescription("Remove an unused player profile after safety checks")
        .addUserOption((option) =>
          option.setName("player").setDescription("Unused player account").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("Staff audit reason").setRequired(true).setMinLength(10).setMaxLength(500),
        ),
    ),

  async execute(client, interaction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      return;
    }

    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        components: [createAlertView("warning", "Staff Access Required", "You need the Moderate Members permission to inspect player profiles.")],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const target = interaction.options.getUser("player", true);

    if (subcommand === "unregister" && !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        components: [createAlertView("warning", "Administrator Required", "Permanent profile removal requires the Administrator permission.")],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    try {
      if (subcommand === "inspect") {
        const inspection = await client.services.playerAdministration.inspect(target.id);
        await interaction.reply({
          components: [createPlayerAdministrationInspectionView(inspection)],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }

      const action = subcommand === "unregister" ? "unregister" : "reset_verification";
      const prepared = await client.services.playerAdministration.prepare(
        action,
        interaction.guildId,
        interaction.user.id,
        target.id,
        interaction.options.getString("reason", true),
      );

      await interaction.reply({
        components: [createPlayerAdministrationConfirmationView(prepared.operation, prepared.inspection)],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    } catch (error: unknown) {
      if (error instanceof PlayerAdministrationError) {
        await interaction.reply({
          components: [createAlertView("warning", "Player Action Rejected", error.message)],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }

      throw error;
    }
  },
};

export default command;
