import { Events } from "discord.js";

import type { VoraClient } from "../client/VoraClient.js";
import { logger } from "../config/logger.js";
import { formatError } from "../utils/formatError.js";

export function registerSquadVoiceHandler(client: VoraClient): void {
  client.once(Events.ClientReady, async (readyClient) => {
    for (const guild of readyClient.guilds.cache.values()) {
      try {
        const result = await client.services.squadVoice.reconcileGuild(guild);

        if (!result.categoryAvailable) {
          logger.warn(
            `Squad voice category unavailable in guild ${guild.id}. Run /server-setup to restore it.`,
          );
          continue;
        }

        if (result.restoredChannels > 0 || result.removedChannels > 0) {
          logger.info(
            `Reconciled squad voice in guild ${guild.id}: restored ${result.restoredChannels}, removed ${result.removedChannels}.`,
          );
        }
      } catch (error: unknown) {
        logger.error(
          `Squad voice reconciliation failed in guild ${guild.id}:\n${formatError(error)}`,
        );
      }
    }
  });
}
