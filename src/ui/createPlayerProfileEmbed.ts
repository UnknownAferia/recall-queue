import type { EmbedBuilder } from "discord.js";

import { Emojis } from "../constants/emojis.js";
import type { PlayerDto } from "../dto/PlayerDto.js";
import { EmbedFactory } from "./EmbedFactory.js";

function calculateWinRate(
  wins: number,
  matchesPlayed: number,
): string {
  if (matchesPlayed === 0) {
    return "0.0%";
  }

  return `${((wins / matchesPlayed) * 100).toFixed(1)}%`;
}

export function createPlayerProfileEmbed(
  player: PlayerDto,
): EmbedBuilder {
  const winRate = calculateWinRate(
    player.statistics.wins,
    player.statistics.matchesPlayed,
  );

  return EmbedFactory.create({
    title: `${Emojis.profile} Player Profile`,

    description: [
      `### ${player.game.ign}`,
      `Connected to <@${player.discord.id}>`,
    ].join("\n"),

    fields: [
      {
        name: "Mobile Legends Account",
        value: [
          `**Player ID:** ${player.game.playerId}`,
          `**Server ID:** ${player.game.serverId}`,
        ].join("\n"),
        inline: false,
      },

      {
        name: `${Emojis.rating} Recall Skill Rating`,
        value: [
          `**RSR:** ${player.rating.rsr}`,
          `**Confidence:** ${player.rating.confidence}%`,
        ].join("\n"),
        inline: true,
      },

      {
        name: `${Emojis.behavior} Behavior`,
        value: [
          `**Score:** ${player.behavior.score}/100`,
          `**Penalties:** ${player.behavior.penalties}`,
        ].join("\n"),
        inline: true,
      },

      {
        name: `${Emojis.matches} Competitive Statistics`,
        value: [
          `**Matches:** ${player.statistics.matchesPlayed}`,
          `**Wins:** ${player.statistics.wins}`,
          `**Losses:** ${player.statistics.losses}`,
          `**Win Rate:** ${winRate}`,
        ].join("\n"),
        inline: false,
      },
    ],
  });
}