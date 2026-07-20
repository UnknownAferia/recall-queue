import type { ContainerBuilder } from "discord.js";

import type { PlayerDto } from "../../dto/PlayerDto.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

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

export function createPublicLeaderboardView(
  players: readonly PlayerDto[],
  updatedAt: Date,
): ContainerBuilder {
  const entries = players.map((player, index) => {
    const rank = RankIcons[index] ?? `**${index + 1}.**`;

    return [
      `${rank} **${player.game.ign}**  ·  <@${player.discord.id}>`,
      `> **${player.rating.rsr.toLocaleString("en-US")} RSR**  ·  ${player.statistics.matchesPlayed} matches  ·  ${calculateWinRate(player)} WR`,
    ].join("\n");
  });

  return ViewFactory.createContainer(0xf1c40f)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Vora Rankings",
        "Global Leaderboard",
        "The highest-rated Vora competitors in the current preview season.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        entries.length > 0
          ? entries.join("\n\n")
          : "No ranked players are available yet.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.footer(
        `Automatically refreshed · Last update <t:${Math.floor(updatedAt.getTime() / 1_000)}:R>`,
      ),
    );
}
