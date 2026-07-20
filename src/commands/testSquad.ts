import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import type { Command } from "../interfaces/Command.js";
import { env } from "../config/env.js";
import { DevelopmentSimulationUnavailableError } from "../services/errors/DevelopmentSimulationUnavailableError.js";
import { createAlertView } from "../ui/createAlertView.js";
import { createClosedSquadView } from "../ui/createClosedSquadView.js";
import { createReadyCheckView } from "../ui/createReadyCheckView.js";

const command: Command = {
  enabled: env.testModeEnabled,

  data: new SlashCommandBuilder()
    .setName("test-squad")
    .setDescription("Run an isolated five-player squad simulation")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Create four test teammates and start a ready check"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reset")
        .setDescription("Remove your simulated squad and test players"),
    ),

  async execute(client, interaction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      return;
    }

    if (interaction.guild.ownerId !== interaction.user.id) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Server Owner Required",
            "Only the Discord server owner can run Vora squad simulations.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    const action = interaction.options.getSubcommand();

    if (action === "start") {
      const voiceEligibility = client.services.queueVoice.getEligibility(
        interaction.member,
      );

      if (!voiceEligibility.eligible) {
        await interaction.reply({
          components: [
            createAlertView(
              "warning",
              "Queue Voice Required",
              voiceEligibility.message ??
                "Join the managed queue voice channel before starting the simulation.",
            ),
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }
    }

    await interaction.reply({
      components: [
        createAlertView(
          "information",
          action === "start" ? "Building Test Squad" : "Resetting Test Data",
          "Vora is preparing the isolated development simulation.",
        ),
      ],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });

    try {
      if (action === "reset") {
        await client.services.developmentSimulation.reset(
          interaction.guildId,
          interaction.user.id,
        );

        await interaction.editReply({
          components: [
            createAlertView(
              "success",
              "Simulation Reset",
              "The simulated squad, queue entries and four test players were removed.",
            ),
          ],
        });
        return;
      }

      const squad = await client.services.developmentSimulation.start(
        interaction.guildId,
        interaction.user.id,
      );

      await interaction.editReply({
        components: [createReadyCheckView(squad)],
      });
      const readyCheckMessage = await interaction.fetchReply();

      client.services.readyCheckExpiration.schedule(
        squad,
        readyCheckMessage.id,
        async (expiredSquad) => {
          await interaction.editReply({
            components: [createClosedSquadView(expiredSquad)],
          });
        },
      );
    } catch (error: unknown) {
      if (error instanceof DevelopmentSimulationUnavailableError) {
        await interaction.editReply({
          components: [
            createAlertView("warning", "Simulation Unavailable", error.message),
          ],
        });
        return;
      }

      throw error;
    }
  },
};

export default command;
