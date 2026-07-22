import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import {
  CustomIds,
  type SeasonLifecycleAction,
} from "../constants/customIds.js";
import type { SeasonDto } from "../dto/SeasonDto.js";
import { ViewFactory } from "./ViewFactory.js";

export function createSeasonLifecycleConfirmationView(
  action: SeasonLifecycleAction,
  season: SeasonDto,
): ContainerBuilder {
  const completing = action === "complete";
  const actionLabel = completing ? "Complete Season" : "Activate Season";
  const warning = completing
    ? "Completing the season freezes every member's final seasonal RSR. This action cannot be reversed through Discord."
    : "Activating this season makes it the single global season used by all subsequently verified matches.";
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(
        CustomIds.buttons.seasonAdmin.lifecycle.execute(action, season.id),
      )
      .setLabel(`Confirm ${actionLabel}`)
      .setEmoji(completing ? "🏁" : "▶️")
      .setStyle(completing ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(CustomIds.buttons.seasonAdmin.cancel)
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary),
  );

  return ViewFactory.createContainer(completing ? 0xda373c : 0xf0b232)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Confirmation Required",
        actionLabel,
        `You are about to ${action} **Season ${season.sequence} · ${season.name}**.`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `**Season ID:** \`${season.id}\``,
          `**Period:** <t:${Math.floor(season.startsAt.getTime() / 1_000)}:F> → <t:${Math.floor(season.endsAt.getTime() / 1_000)}:F>`,
          `**Rule snapshot:** ${season.rules.baselineRsr} baseline RSR · ${season.rules.placementMatches} placements · ${Math.round(season.rules.softResetRetention * 100)}% retention`,
          "",
          `⚠️ ${warning}`,
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addActionRowComponents(actions)
    .addTextDisplayComponents(ViewFactory.footer());
}
