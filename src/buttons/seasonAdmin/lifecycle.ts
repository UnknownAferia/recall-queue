import { MessageFlags } from "discord.js";

import {
  CustomIds,
  parseSeasonLifecycleCustomId,
} from "../../constants/customIds.js";
import type { SeasonControlStateDto, SeasonDto } from "../../dto/SeasonDto.js";
import type { Button } from "../../interfaces/Button.js";
import { InvalidSeasonDataError } from "../../services/errors/InvalidSeasonDataError.js";
import { SeasonLifecycleError } from "../../services/errors/SeasonLifecycleError.js";
import { createAlertView } from "../../ui/createAlertView.js";
import { createSeasonControlView } from "../../ui/createSeasonControlView.js";
import { createSeasonLifecycleConfirmationView } from "../../ui/createSeasonLifecycleConfirmationView.js";

function findTargetSeason(
  state: SeasonControlStateDto,
  action: "activate" | "complete",
  seasonId: string,
): SeasonDto | null {
  if (action === "complete") {
    return state.active?.id === seasonId ? state.active : null;
  }

  return state.scheduled.find((season) => season.id === seasonId) ?? null;
}

const button: Button = {
  customId: CustomIds.buttons.seasonAdmin.lifecycle.route,
  matches: (customId) => parseSeasonLifecycleCustomId(customId) !== null,

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
            "Only the Discord server owner can change the season lifecycle.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });

      return;
    }

    const parsed = parseSeasonLifecycleCustomId(interaction.customId);

    if (!parsed) {
      return;
    }

    if (parsed.stage === "review") {
      const state = await client.services.seasons.getControlState();
      const season = findTargetSeason(state, parsed.action, parsed.seasonId);

      if (!season) {
        await interaction.update({
          components: [
            createSeasonControlView(
              state,
              new Date(),
              "The selected season changed. The control center was refreshed.",
            ),
          ],
        });
        return;
      }

      await interaction.update({
        components: [
          createSeasonLifecycleConfirmationView(parsed.action, season),
        ],
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      const season =
        parsed.action === "activate"
          ? await client.services.seasons.activate(
              parsed.seasonId,
              interaction.user.id,
            )
          : await client.services.seasons.complete(
              parsed.seasonId,
              interaction.user.id,
            );
      const state = await client.services.seasons.getControlState();
      const notice =
        parsed.action === "activate"
          ? `Season ${season.sequence} · ${season.name} is now active.`
          : `Season ${season.sequence} · ${season.name} was completed.`;

      await interaction.editReply({
        components: [createSeasonControlView(state, new Date(), notice)],
      });
    } catch (error: unknown) {
      if (
        error instanceof InvalidSeasonDataError ||
        error instanceof SeasonLifecycleError
      ) {
        await interaction.editReply({
          components: [
            createAlertView("warning", "Season Change Rejected", error.message),
          ],
        });
        return;
      }

      throw error;
    }
  },
};

export default button;
