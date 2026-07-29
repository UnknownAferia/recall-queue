import {
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

import type { ScrimRegion } from "../../types/scrim.js";
import { createAlertView } from "../../ui/createAlertView.js";
import type { CommunityClient } from "../CommunityClient.js";
import { createScrimListingsView } from "../ui/createScrimView.js";

export const ScrimCommandName = "scrim";
const regions = [
  { name: "Europe", value: "eu" },
  { name: "North America", value: "na" },
  { name: "Southeast Asia", value: "sea" },
  { name: "Other", value: "other" },
] as const;

export const scrimCommandData = new SlashCommandBuilder()
  .setName(ScrimCommandName)
  .setDescription("Find an opposing five-player team for a custom game")
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((command) =>
    command
      .setName("create")
      .setDescription("Publish your team's scrim availability for seven days")
      .addStringOption((option) =>
        option
          .setName("team")
          .setDescription("Team name")
          .setMinLength(2)
          .setMaxLength(40)
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("region")
          .setDescription("Match region")
          .addChoices(...regions)
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("availability")
          .setDescription("Days and times, including timezone")
          .setMinLength(3)
          .setMaxLength(80)
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("notes")
          .setDescription("Optional rank, format or contact notes")
          .setMaxLength(200),
      ),
  )
  .addSubcommand((command) =>
    command
      .setName("browse")
      .setDescription("Browse teams currently looking for an opponent")
      .addStringOption((option) =>
        option
          .setName("region")
          .setDescription("Optional region filter")
          .addChoices(...regions),
      ),
  )
  .addSubcommand((command) =>
    command
      .setName("close")
      .setDescription("Close one of your scrim listings")
      .addStringOption((option) =>
        option
          .setName("listing")
          .setDescription("Listing reference from /scrim browse")
          .setRequired(true),
      ),
  );

export async function executeScrimCommand(
  client: CommunityClient,
  interaction: ChatInputCommandInteraction,
) {
  if (!interaction.inCachedGuild()) {
    return;
  }

  const subcommand = interaction.options.getSubcommand(true);
  try {
    if (subcommand === "create") {
      const listing = await client.scrims.create({
        guildId: interaction.guildId,
        captainDiscordId: interaction.user.id,
        teamName: interaction.options.getString("team", true),
        region: interaction.options.getString("region", true) as ScrimRegion,
        availability: interaction.options.getString("availability", true),
        notes: interaction.options.getString("notes"),
      });
      await interaction.reply({
        components: [
          createAlertView(
            "success",
            "Scrim Listing Published",
            `**${listing.teamName}** is visible in \`/scrim browse\` for seven days.\nListing: \`${listing.id}\``,
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    if (subcommand === "close") {
      const listing = await client.scrims.close(
        interaction.guildId,
        interaction.options.getString("listing", true),
        interaction.user.id,
      );
      await interaction.reply({
        components: [
          createAlertView(
            "success",
            "Scrim Listing Closed",
            `**${listing.teamName}** is no longer accepting opponents.`,
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    const listings = await client.scrims.browse(
      interaction.guildId,
      interaction.options.getString("region") as ScrimRegion | null,
    );
    await interaction.reply({
      components: [createScrimListingsView(listings)],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  } catch (error: unknown) {
    await interaction.reply({
      components: [
        createAlertView(
          "warning",
          "Scrim Listing Unavailable",
          error instanceof Error
            ? error.message
            : "The request could not be completed.",
        ),
      ],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  }
}
