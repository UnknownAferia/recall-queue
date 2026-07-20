import type { ContainerBuilder } from "discord.js";

import { QueueConfig } from "../constants/queue.js";
import type { QueueDocument } from "../models/QueueModel.js";
import { createQueueComponents } from "./createQueueComponents.js";
import { ViewFactory } from "./ViewFactory.js";

function createProgressBar(current: number, maximum: number): string {
  const filled = Math.min(maximum, Math.max(0, current));

  return `${"▰".repeat(filled)}${"▱".repeat(maximum - filled)}`;
}

function createWaitingList(queue: QueueDocument): string {
  if (queue.entries.length === 0) {
    return "-# No players are currently waiting. Be the first to join.";
  }

  const visibleEntries = queue.entries.slice(0, QueueConfig.visiblePlayerLimit);

  const waitingPlayers = visibleEntries
    .map(
      (entry, index) =>
        `**${String(index + 1).padStart(2, "0")}**  <@${entry.discordId}>  •  <t:${Math.floor(entry.joinedAt.getTime() / 1_000)}:R>`,
    )
    .join("\n");

  const hiddenPlayers = queue.entries.length - visibleEntries.length;

  return hiddenPlayers > 0
    ? `${waitingPlayers}\n-# ...and ${hiddenPlayers} more player${hiddenPlayers === 1 ? "" : "s"}.`
    : waitingPlayers;
}

export function createQueueView(
  queue: QueueDocument,
  viewerDiscordId: string,
  bannedUntil: Date | null = null,
): ContainerBuilder {
  const viewerIsQueued = queue.entries.some(
    (entry) => entry.discordId === viewerDiscordId,
  );

  const status = queue.status === "open" ? "🟢 OPEN" : "🔒 LOCKED";
  const nextSquadProgress = Math.min(
    queue.entries.length,
    QueueConfig.teamSize,
  );
  const accessSuspended =
    bannedUntil !== null && bannedUntil.getTime() > Date.now();

  return ViewFactory.createContainer(
    queue.status === "open" ? 0x23a55a : 0x80848e,
  )
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Competitive Matchmaking",
        "Teammate Pool",
        "Enter the pool and let Vora form a compatible five-player squad for Mobile Legends.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `### ${status}`,
          `**${queue.entries.length} player${queue.entries.length === 1 ? "" : "s"} in the pool**`,
          `**${nextSquadProgress}/${QueueConfig.teamSize} toward the next squad**  ${createProgressBar(nextSquadProgress, QueueConfig.teamSize)}`,
          `-# Your status: ${viewerIsQueued ? "Waiting in queue" : "Not queued"}`,
          accessSuspended
            ? `> Matchmaking access suspended until <t:${Math.floor(bannedUntil.getTime() / 1_000)}:R>.`
            : null,
        ]
          .filter((line): line is string => line !== null)
          .join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        ["### Waiting players", createWaitingList(queue)].join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addActionRowComponents(
      ...createQueueComponents(queue, viewerDiscordId, accessSuspended),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Remain in the queue-lobby voice channel while waiting for a squad.",
      ),
    );
}
