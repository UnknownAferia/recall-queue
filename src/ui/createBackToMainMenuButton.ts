import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import { Emojis } from "../constants/emojis.js";

export function createBackToMainMenuButton(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomIds.buttons.navigation.mainMenu)
      .setLabel("Back to Main Menu")
      .setEmoji(Emojis.back)
      .setStyle(ButtonStyle.Secondary),
  );
}