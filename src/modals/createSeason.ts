import { MessageFlags } from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import type { Modal } from "../interfaces/Modal.js";
import { InvalidSeasonDataError } from "../services/errors/InvalidSeasonDataError.js";
import { SeasonLifecycleError } from "../services/errors/SeasonLifecycleError.js";
import { createAlertView } from "../ui/createAlertView.js";
import { createSeasonControlView } from "../ui/createSeasonControlView.js";

const modal: Modal = {
  customId: CustomIds.modals.createSeason,

  async execute(client, interaction): Promise<void> {
    if (
      !interaction.inCachedGuild() ||
      interaction.guild.ownerId !== interaction.user.id
    ) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Server Owner Required",
            "Only the Discord server owner can schedule a Vora season.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });

      return;
    }

    const sequence = Number(
      interaction.fields.getTextInputValue(
        CustomIds.inputs.createSeason.sequence,
      ),
    );
    const name = interaction.fields.getTextInputValue(
      CustomIds.inputs.createSeason.name,
    );
    const softResetRetention = Number(
      interaction.fields.getTextInputValue(
        CustomIds.inputs.createSeason.softResetRetention,
      ),
    );
    const startsAt = new Date(
      interaction.fields.getTextInputValue(
        CustomIds.inputs.createSeason.startsAt,
      ),
    );
    const endsAt = new Date(
      interaction.fields.getTextInputValue(
        CustomIds.inputs.createSeason.endsAt,
      ),
    );

    try {
      const season = await client.services.seasons.createScheduled({
        sequence,
        name,
        slug: `season-${sequence}-${name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}`,
        startsAt,
        endsAt,
        createdByDiscordId: interaction.user.id,
        rules: {
          softResetRetention: softResetRetention / 100,
        },
      });
      const state = await client.services.seasons.getControlState();

      await interaction.reply({
        components: [
          createSeasonControlView(
            state,
            new Date(),
            `Season ${season.sequence} · ${season.name} was scheduled.`,
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    } catch (error: unknown) {
      if (
        error instanceof InvalidSeasonDataError ||
        error instanceof SeasonLifecycleError
      ) {
        await interaction.reply({
          components: [
            createAlertView("warning", "Season Not Scheduled", error.message),
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }

      throw error;
    }
  },
};

export default modal;
