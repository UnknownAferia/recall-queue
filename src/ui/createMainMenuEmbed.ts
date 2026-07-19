import type { EmbedBuilder } from "discord.js";

import { Emojis } from "../constants/emojis.js";
import type { PlayerDto } from "../dto/PlayerDto.js";
import { EmbedFactory } from "./EmbedFactory.js";

export function createMainMenuEmbed(
  player: PlayerDto | null,
): EmbedBuilder {
  if (!player) {
    return EmbedFactory.information(
      "RecallQ",
      [
        "Welcome to competitive Mobile Legends matchmaking.",
        "",
        "You have not registered a Mobile Legends account yet.",
        "Use `/register` to create your RecallQ player profile.",
      ].join("\n"),
    );
  }

  return EmbedFactory.create({
    title: "RecallQ",

    description: [
      `Welcome back, **${player.game.ign}**.`,
      "",
      "Select an option below to continue.",
    ].join("\n"),

    fields: [
      {
        name: `${Emojis.rating} Current RSR`,
        value: player.rating.rsr.toString(),
        inline: true,
      },

      {
        name: `${Emojis.matches} Matches Played`,
        value: player.statistics.matchesPlayed.toString(),
        inline: true,
      },

      {
        name: `${Emojis.behavior} Behavior Score`,
        value: `${player.behavior.score}/100`,
        inline: true,
      },
    ],
  });
}