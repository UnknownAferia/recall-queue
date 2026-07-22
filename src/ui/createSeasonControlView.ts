import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import type { SeasonControlStateDto, SeasonDto } from "../dto/SeasonDto.js";
import { ViewFactory } from "./ViewFactory.js";

function discordTimestamp(date: Date, style: "F" | "R" = "F"): string {
  return `<t:${Math.floor(date.getTime() / 1_000)}:${style}>`;
}

function formatSeason(season: SeasonDto): string {
  return [
    `**Season ${season.sequence} · ${season.name}**`,
    `> \`${season.slug}\``,
    `> ${discordTimestamp(season.startsAt)} → ${discordTimestamp(season.endsAt)}`,
    `> Baseline **${season.rules.baselineRsr} RSR** · Placements **${season.rules.placementMatches}** · Retention **${Math.round(season.rules.softResetRetention * 100)}%**`,
  ].join("\n");
}

function formatList(
  title: string,
  seasons: readonly SeasonDto[],
  emptyMessage: string,
): string {
  return [
    `### ${title}`,
    seasons.length > 0
      ? seasons.map(formatSeason).join("\n\n")
      : `> ${emptyMessage}`,
  ].join("\n");
}

export function createSeasonControlView(
  state: SeasonControlStateDto,
  now = new Date(),
  notice?: string,
): ContainerBuilder {
  const activationCandidate = state.active
    ? null
    : state.scheduled.find(
        (season) => now >= season.startsAt && now < season.endsAt,
      );
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomIds.buttons.seasonAdmin.create)
      .setLabel("Schedule Season")
      .setEmoji("🗓️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(CustomIds.buttons.seasonAdmin.refresh)
      .setLabel("Refresh")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),
  );

  if (state.active) {
    actions.addComponents(
      new ButtonBuilder()
        .setCustomId(
          CustomIds.buttons.seasonAdmin.lifecycle.review(
            "complete",
            state.active.id,
          ),
        )
        .setLabel("Review Completion")
        .setEmoji("🏁")
        .setStyle(ButtonStyle.Danger),
    );
  } else if (activationCandidate) {
    actions.addComponents(
      new ButtonBuilder()
        .setCustomId(
          CustomIds.buttons.seasonAdmin.lifecycle.review(
            "activate",
            activationCandidate.id,
          ),
        )
        .setLabel("Review Activation")
        .setEmoji("▶️")
        .setStyle(ButtonStyle.Success),
    );
  }

  const activeSection = state.active
    ? formatList("Active Season", [state.active], "")
    : "### Active Season\n> No season is active. Eligible scheduled seasons can be activated below.";

  return ViewFactory.createContainer(state.active ? 0x23a55a : 0x5865f2)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Owner Operations",
        "Season Control Center",
        "Manage Vora's global competitive season lifecycle. Changes apply to every configured Discord server.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          notice ? `### ✅ ${notice}` : null,
          activeSection,
          formatList(
            "Scheduled Seasons",
            state.scheduled,
            "No future seasons have been scheduled.",
          ),
          formatList(
            "Recently Completed",
            state.recentlyCompleted,
            "No season has been completed yet.",
          ),
        ]
          .filter((entry): entry is string => Boolean(entry))
          .join("\n\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addActionRowComponents(actions)
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Activation is available only between a season's configured start and end dates.",
      ),
    );
}
