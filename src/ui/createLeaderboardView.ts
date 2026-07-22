import type { ContainerBuilder } from "discord.js";

import type { PlayerDto } from "../dto/PlayerDto.js";
import type { SeasonLeaderboardDto } from "../dto/SeasonDto.js";
import { createBackToMainMenuButton } from "./createBackToMainMenuButton.js";
import { ViewFactory } from "./ViewFactory.js";

const RankIcons = ["🥇", "🥈", "🥉"] as const;

function calculateWinRate(wins: number, matchesPlayed: number): string {
  if (matchesPlayed === 0) {
    return "0.0%";
  }

  return `${((wins / matchesPlayed) * 100).toFixed(1)}%`;
}

function formatSeasonalEntries(
  leaderboard: SeasonLeaderboardDto | null,
  viewerDiscordId: string,
): string {
  if (!leaderboard) {
    return "### Seasonal Ranking\n> No Vora season is available yet.";
  }

  const entries = leaderboard.entries.map((entry) => {
    const rank = RankIcons[entry.rank - 1] ?? `**${entry.rank}.**`;
    const viewerMarker = entry.discordId === viewerDiscordId ? " `YOU`" : "";

    return [
      `${rank} **${entry.ign}**${viewerMarker}`,
      `> **${entry.currentRsr.toLocaleString()} RSR** · ${entry.matchesPlayed} matches · ${calculateWinRate(entry.wins, entry.matchesPlayed)} WR`,
    ].join("\n");
  });

  return [
    `### Season ${leaderboard.season.sequence} · ${leaderboard.season.name}`,
    entries.length > 0
      ? entries.join("\n\n")
      : `> No player has completed ${leaderboard.season.rules.placementMatches} seasonal placement matches yet.`,
  ].join("\n\n");
}

function formatLifetimeEntries(
  players: readonly PlayerDto[],
  viewerDiscordId: string,
): string {
  if (players.length === 0) {
    return "### Lifetime Rating\n> No ranked players are available yet.";
  }

  return [
    "### Lifetime Rating",
    players
      .map((player, index) => {
        const rank = RankIcons[index] ?? `**${index + 1}.**`;
        const viewerMarker =
          player.discord.id === viewerDiscordId ? " `YOU`" : "";

        return [
          `${rank} **${player.game.ign}**${viewerMarker}`,
          `> **${player.rating.rsr.toLocaleString()} RSR** · ${player.statistics.matchesPlayed} matches · ${calculateWinRate(player.statistics.wins, player.statistics.matchesPlayed)} WR`,
        ].join("\n");
      })
      .join("\n\n"),
  ].join("\n");
}

export function createLeaderboardView(
  players: readonly PlayerDto[],
  viewerDiscordId: string,
  seasonal: SeasonLeaderboardDto | null = null,
): ContainerBuilder {
  return ViewFactory.createContainer(0xf1c40f)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Vora Rankings",
        "Competitive Leaderboards",
        "Seasonal progression alongside Vora's long-term matchmaking rating.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(formatSeasonalEntries(seasonal, viewerDiscordId)),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(formatLifetimeEntries(players, viewerDiscordId)),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addActionRowComponents(createBackToMainMenuButton())
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Season rankings require completed placements; lifetime RSR continues across seasons.",
      ),
    );
}
