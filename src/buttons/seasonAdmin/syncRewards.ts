import { MessageFlags } from "discord.js";

import { CustomIds } from "../../constants/customIds.js";
import type { Button } from "../../interfaces/Button.js";
import { createAlertView } from "../../ui/createAlertView.js";
import { createSeasonControlView } from "../../ui/createSeasonControlView.js";

const button: Button = {
  customId: CustomIds.buttons.seasonAdmin.syncRewards,

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
            "Only the Discord server owner can synchronize season rewards.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    await interaction.deferUpdate();

    const state = await client.services.seasons.getControlState();
    const latestSeason = state.recentlyCompleted[0];

    if (!latestSeason) {
      await interaction.editReply({
        components: [
          createSeasonControlView(
            state,
            new Date(),
            "No completed season is available for reward synchronization.",
          ),
        ],
      });
      return;
    }

    const result = await client.services.seasonRewards.synchronize(
      client.guilds.cache.values(),
      latestSeason.id,
    );

    await interaction.editReply({
      components: [
        createSeasonControlView(
          state,
          new Date(),
          `Reward roles synchronized: ${result.membersChanged} member assignment(s) changed across ${result.guildsProcessed} server(s); ${result.guildsSkipped} server(s) skipped.`,
        ),
      ],
    });
  },
};

export default button;
