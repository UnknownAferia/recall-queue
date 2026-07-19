import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import { Emojis } from "../constants/emojis.js";

export function createMainMenuComponents(): ActionRowBuilder<ButtonBuilder>[] {
  const firstRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomIds.buttons.mainMenu.profile)
      .setLabel("Profile")
      .setEmoji(Emojis.profile)
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(CustomIds.buttons.mainMenu.queue)
      .setLabel("Queue")
      .setEmoji(Emojis.queue)
      .setStyle(ButtonStyle.Success),
  );

  const secondRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomIds.buttons.mainMenu.matchHistory)
      .setLabel("Match History")
      .setEmoji(Emojis.history)
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(CustomIds.buttons.mainMenu.leaderboard)
      .setLabel("Leaderboard")
      .setEmoji(Emojis.leaderboard)
      .setStyle(ButtonStyle.Secondary),
  );

  return [firstRow, secondRow];
}