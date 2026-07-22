import type { ContainerBuilder } from "discord.js";

import type { SeasonAchievement } from "../constants/season.js";
import type { SeasonHistoryEntryDto } from "../dto/SeasonDto.js";
import { createBackToMainMenuButton } from "./createBackToMainMenuButton.js";
import { ViewFactory } from "./ViewFactory.js";

const AchievementLabels: Readonly<Record<SeasonAchievement, string>> = {
  champion: "🏆 Champion",
  topTen: "⭐ Top 10",
  veteran: "🛡️ Veteran",
};

function formatWinRate(entry: SeasonHistoryEntryDto): string {
  if (entry.matchesPlayed === 0) {
    return "0.0%";
  }

  return `${((entry.wins / entry.matchesPlayed) * 100).toFixed(1)}%`;
}

function formatEntry(entry: SeasonHistoryEntryDto): string {
  const status =
    entry.season.status === "active"
      ? "🟢 Active"
      : entry.season.status === "completed"
        ? "🏁 Completed"
        : "🗓️ Scheduled";
  const standing = entry.placementComplete
    ? [
        `**${(entry.finalRsr ?? entry.currentRsr).toLocaleString()} RSR**`,
        entry.finalRank ? `Final rank **#${entry.finalRank}**` : null,
        `Peak **${entry.peakRsr.toLocaleString()}**`,
      ]
        .filter((value): value is string => value !== null)
        .join(" · ")
    : `Placements **${entry.matchesPlayed}/${entry.season.rules.placementMatches}**`;
  const achievements = entry.achievements
    .map((achievement) => AchievementLabels[achievement])
    .join(" · ");

  return [
    `### Season ${entry.season.sequence} · ${entry.season.name}`,
    `> ${status} · ${standing}`,
    `> ${entry.matchesPlayed} matches · ${entry.wins}W/${entry.losses}L · ${formatWinRate(entry)} WR`,
    achievements ? `> ${achievements}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function createSeasonHistoryView(
  entries: readonly SeasonHistoryEntryDto[],
): ContainerBuilder {
  return ViewFactory.createContainer(0x1fc8ff)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Competitive Progression",
        "Season History",
        "Your seasonal placements, peaks, final rankings and earned distinctions.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        entries.length > 0
          ? entries.map(formatEntry).join("\n\n")
          : "You have not played a verified match during a Vora season yet.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addActionRowComponents(createBackToMainMenuButton())
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Seasonal ratings are separate from Vora's long-term matchmaking rating.",
      ),
    );
}
