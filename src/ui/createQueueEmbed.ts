import type { EmbedBuilder } from "discord.js";

import type { QueueDocument } from "../models/QueueModel.js";
import { EmbedFactory } from "./EmbedFactory.js";

function createPlayerList(queue: QueueDocument): string {
  if (queue.entries.length === 0) {
    return "No players are currently waiting.";
  }

  return queue.entries
    .map(
      (entry, index) =>
        `**${index + 1}.** <@${entry.discordId}>`,
    )
    .join("\n");
}

export function createQueueEmbed(
  queue: QueueDocument,
  viewerDiscordId: string,
): EmbedBuilder {
  const viewerIsQueued = queue.entries.some(
    (entry) => entry.discordId === viewerDiscordId,
  );

  const availableSlots =
    queue.maximumPlayers - queue.entries.length;

  return EmbedFactory.create({
    title: "🎮 Matchmaking Queue",
    description: [
      `**Status:** ${queue.status === "open" ? "Open" : "Locked"}`,
      `**Players:** ${queue.entries.length}/${queue.maximumPlayers}`,
      `**Available Slots:** ${availableSlots}`,
      `**Your Status:** ${
        viewerIsQueued ? "In Queue" : "Not in Queue"
      }`,
    ].join("\n"),
    fields: [
      {
        name: "Waiting Players",
        value: createPlayerList(queue),
        inline: false,
      },
    ],
  });
}