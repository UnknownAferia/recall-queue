import { Events } from "discord.js";

import type { VoraClient } from "../client/VoraClient.js";
import { logger } from "../config/logger.js";
import { formatError } from "../utils/formatError.js";

export function registerVoiceQueueHandler(client: VoraClient): void {
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    try {
      const removed = await client.services.queueVoice.handleVoiceStateUpdate(
        oldState,
        newState,
      );

      if (removed) {
        logger.info(
          `Removed ${oldState.id} from the queue in guild ${oldState.guild.id} after leaving the queue lobby.`,
        );
      }
    } catch (error: unknown) {
      logger.error(
        `Voice queue update failed in guild ${oldState.guild.id}:\n${formatError(error)}`,
      );
    }
  });

  client.once(Events.ClientReady, async (readyClient) => {
    for (const guild of readyClient.guilds.cache.values()) {
      try {
        const result = await client.services.queueVoice.reconcileGuild(guild);

        if (!result.queueLobbyAvailable) {
          logger.warn(
            `Queue lobby unavailable in guild ${guild.id}. Run /server-setup to restore the managed channel.`,
          );
          continue;
        }

        if (result.removedPlayers > 0) {
          logger.info(
            `Removed ${result.removedPlayers} stale queue entr${result.removedPlayers === 1 ? "y" : "ies"} in guild ${guild.id}.`,
          );
        }
      } catch (error: unknown) {
        logger.error(
          `Voice queue reconciliation failed in guild ${guild.id}:\n${formatError(error)}`,
        );
      }
    }
  });
}
