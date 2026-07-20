import type { ContainerBuilder } from "discord.js";

import type { PlayerDto } from "../dto/PlayerDto.js";
import { createBackToMainMenuButton } from "./createBackToMainMenuButton.js";
import { ViewFactory } from "./ViewFactory.js";

const RankIcons = ["🥇", "🥈", "🥉"] as const;

function calculateWinRate(player: PlayerDto): string {
  if (player.statistics.matchesPlayed === 0) {
    return "0.0%";
  }

  return `${(
    (player.statistics.wins / player.statistics.matchesPlayed) *
    100
  ).toFixed(1)}%`;
}

function createEntry(
  player: PlayerDto,
  index: number,
  viewerDiscordId: string,
): string {
  const rank = RankIcons[index] ?? `**${index + 1}.**`;
  const viewerMarker = player.discord.id === viewerDiscordId ? "  `YOU`" : "";

  return [
    `${rank} **${player.game.ign}**${viewerMarker}`,
    `> **${player.rating.rsr.toLocaleString()} RSR**  •  ${player.statistics.matchesPlayed} matches  •  ${calculateWinRate(player)} WR`,
  ].join("\n");
}

export function createLeaderboardView(
  players: readonly PlayerDto[],
  viewerDiscordId: string,
): ContainerBuilder {
  const container = ViewFactory.createContainer(0xf1c40f)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Vora Rankings",
        "Global Leaderboard",
        "The highest-rated competitors in the current preview season.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator());

  container.addTextDisplayComponents(
    ViewFactory.text(
      players.length === 0
        ? "No ranked players are available yet."
        : players
            .map((player, index) => createEntry(player, index, viewerDiscordId))
            .join("\n\n"),
    ),
  );

  return container
    .addSeparatorComponents(ViewFactory.separator())
    .addActionRowComponents(createBackToMainMenuButton())
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Ratings remain provisional during each player's first ten verified matches.",
      ),
    );
}
