import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { CustomIds } from "../constants/customIds.js";

function createInput(
  customId: string,
  label: string,
  placeholder: string,
  maximumLength: number,
): ActionRowBuilder<TextInputBuilder> {
  return new ActionRowBuilder<TextInputBuilder>().addComponents(
    new TextInputBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setPlaceholder(placeholder)
      .setStyle(TextInputStyle.Short)
      .setMaxLength(maximumLength)
      .setRequired(true),
  );
}

export function createSeasonModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(CustomIds.modals.createSeason)
    .setTitle("Schedule a Vora Season")
    .addComponents(
      createInput(
        CustomIds.inputs.createSeason.sequence,
        "Season number",
        "Example: 1",
        6,
      ),
      createInput(
        CustomIds.inputs.createSeason.name,
        "Season name",
        "Example: Alpha Season",
        64,
      ),
      createInput(
        CustomIds.inputs.createSeason.slug,
        "Stable slug",
        "Example: alpha-season",
        64,
      ),
      createInput(
        CustomIds.inputs.createSeason.startsAt,
        "Start date and time (UTC)",
        "2026-08-01T18:00:00Z",
        32,
      ),
      createInput(
        CustomIds.inputs.createSeason.endsAt,
        "End date and time (UTC)",
        "2026-11-01T18:00:00Z",
        32,
      ),
    );
}
