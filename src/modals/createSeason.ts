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
    const slug = interaction.fields.getTextInputValue(
      CustomIds.inputs.createSeason.slug,
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
        slug,
        startsAt,
        endsAt,
        createdByDiscordId: interaction.user.id,
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
