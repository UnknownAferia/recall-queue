import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import type { QueueDocument } from "../models/QueueModel.js";

export function createQueueComponents(
  queue: QueueDocument,
  viewerDiscordId: string,
): ActionRowBuilder<ButtonBuilder>[] {
  const viewerIsQueued = queue.entries.some(
    (entry) => entry.discordId === viewerDiscordId,
  );

  const queueIsFull =
    queue.entries.length >= queue.maximumPlayers;

  const queueIsLocked = queue.status !== "open";

  const queueActions =
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CustomIds.buttons.queue.join)
        .setLabel("Join Queue")
        .setEmoji("➕")
        .setStyle(ButtonStyle.Success)
        .setDisabled(
          viewerIsQueued || queueIsFull || queueIsLocked,
        ),

      new ButtonBuilder()
        .setCustomId(CustomIds.buttons.queue.leave)
        .setLabel("Leave Queue")
        .setEmoji("➖")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!viewerIsQueued),

      new ButtonBuilder()
        .setCustomId(CustomIds.buttons.queue.refresh)
        .setLabel("Refresh")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Secondary),
    );

  const navigation =
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(
          CustomIds.buttons.navigation.mainMenu,
        )
        .setLabel("Back to Main Menu")
        .setEmoji("↩️")
        .setStyle(ButtonStyle.Secondary),
    );

  return [queueActions, navigation];
}