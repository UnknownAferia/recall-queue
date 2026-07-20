import type { ContainerBuilder } from "discord.js";

import { PlayerRoleLabels, type PlayerRole } from "../constants/playerRoles.js";
import type { PlayerDto } from "../dto/PlayerDto.js";
import { RatingConfig } from "../domain/rating/RatingConfig.js";
import { createBackToMainMenuButton } from "./createBackToMainMenuButton.js";
import { ViewFactory } from "./ViewFactory.js";

function calculateWinRate(player: PlayerDto): string {
  if (player.statistics.matchesPlayed === 0) {
    return "0.0%";
  }

  return `${(
    (player.statistics.wins / player.statistics.matchesPlayed) *
    100
  ).toFixed(1)}%`;
}

function formatRole(role: PlayerRole | null, fallback: string): string {
  return role ? PlayerRoleLabels[role] : fallback;
}

export function createPlayerProfileView(player: PlayerDto): ContainerBuilder {
  const placementProgress = Math.min(
    player.statistics.matchesPlayed,
    RatingConfig.placementMatches,
  );

  return ViewFactory.createContainer()
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Player Profile",
        player.game.ign,
        `Connected to <@${player.discord.id}>`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Competitive rating",
          `> **${player.rating.rsr.toLocaleString()} RSR**  •  ${player.rating.confidence}% confidence`,
          placementProgress < RatingConfig.placementMatches
            ? `> **Placement progress:** ${placementProgress}/${RatingConfig.placementMatches}`
            : null,
          "",
          `**Matches**  ${player.statistics.matchesPlayed}  •  **Wins**  ${player.statistics.wins}  •  **Losses**  ${player.statistics.losses}  •  **Win rate**  ${calculateWinRate(player)}`,
        ]
          .filter((line): line is string => line !== null)
          .join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Role identity",
          `🥇 **Primary**  ${formatRole(player.preferences.roles.primary, "Not set")}`,
          `🥈 **Secondary**  ${formatRole(player.preferences.roles.secondary, "Not set")}`,
          `🚫 **Avoided**  ${formatRole(player.preferences.roles.avoided, "None")}`,
        ].join("\n"),
      ),
      ViewFactory.text(
        [
          "### Account standing",
          `🛡️ **Behavior**  ${player.behavior.score}/100  •  **Penalties**  ${player.behavior.penalties}`,
          `✅ **Ready checks**  ${player.queue.acceptedMatches} accepted  •  ${player.queue.declinedMatches} declined or missed`,
          player.behavior.integrityLevel > 0
            ? `⚖️ **Integrity level**  ${player.behavior.integrityLevel}/3  -# decreases after incident-free months`
            : null,
          player.queue.disciplineLevel > 0
            ? `⚠️ **Discipline level**  ${player.queue.disciplineLevel}/3  -# decreases after incident-free days`
            : null,
          player.queue.bannedUntil &&
          player.queue.bannedUntil.getTime() > Date.now()
            ? `⏳ **Queue suspended until** <t:${Math.floor(player.queue.bannedUntil.getTime() / 1_000)}:R>`
            : null,
          `🎮 **MLBB ID**  ${player.game.playerId} (${player.game.serverId})`,
        ]
          .filter((line): line is string => line !== null)
          .join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addActionRowComponents(createBackToMainMenuButton())
    .addTextDisplayComponents(ViewFactory.footer());
}
