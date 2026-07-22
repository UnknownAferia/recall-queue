import type { ContainerBuilder } from "discord.js";

import type { PlayerDto } from "../../dto/PlayerDto.js";
import type { SeasonLeaderboardDto } from "../../dto/SeasonDto.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

const RankIcons = ["🥇", "🥈", "🥉"] as const;

function winRate(wins: number, matches: number): string {
  return matches === 0 ? "0.0%" : `${((wins / matches) * 100).toFixed(1)}%`;
}

function seasonalSection(leaderboard: SeasonLeaderboardDto | null): string {
  if (!leaderboard) {
    return "### Seasonal Ranking\n> No Vora season is available yet.";
  }

  const entries = leaderboard.entries.map((entry) => {
    const rank = RankIcons[entry.rank - 1] ?? `**${entry.rank}.**`;

    return [
      `${rank} **${entry.ign}** · <@${entry.discordId}>`,
      `> **${entry.currentRsr.toLocaleString("en-US")} RSR** · ${entry.matchesPlayed} matches · ${winRate(entry.wins, entry.matchesPlayed)} WR`,
    ].join("\n");
  });

  return [
    `### Season ${leaderboard.season.sequence} · ${leaderboard.season.name}`,
    entries.length > 0
      ? entries.join("\n\n")
      : `> Waiting for players to complete ${leaderboard.season.rules.placementMatches} placements.`,
  ].join("\n\n");
}

function lifetimeSection(players: readonly PlayerDto[]): string {
  const entries = players.map((player, index) => {
    const rank = RankIcons[index] ?? `**${index + 1}.**`;

    return [
      `${rank} **${player.game.ign}** · <@${player.discord.id}>`,
      `> **${player.rating.rsr.toLocaleString("en-US")} RSR** · ${player.statistics.matchesPlayed} matches · ${winRate(player.statistics.wins, player.statistics.matchesPlayed)} WR`,
    ].join("\n");
  });

  return [
    "### Lifetime Rating",
    entries.length > 0 ? entries.join("\n\n") : "> No ranked players yet.",
  ].join("\n");
}

export function createPublicLeaderboardView(
  players: readonly PlayerDto[],
  updatedAt: Date,
  seasonal: SeasonLeaderboardDto | null = null,
  iconAttachmentName?: string,
): ContainerBuilder {
  const view = ViewFactory.createContainer(0xf1c40f);

  ViewFactory.addHeading(
    view,
    "Vora Rankings",
    "Competitive Leaderboards",
    "Season performance and long-term Vora matchmaking rating.",
    iconAttachmentName,
    "Vora competitive victory",
  );

  return view
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(ViewFactory.text(seasonalSection(seasonal)))
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(ViewFactory.text(lifetimeSection(players)))
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.footer(
        `Automatically refreshed · Last update <t:${Math.floor(updatedAt.getTime() / 1_000)}:R>`,
      ),
    );
}
