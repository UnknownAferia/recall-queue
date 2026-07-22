import { Events } from "discord.js";

import { logger } from "../config/logger.js";
import { formatError } from "../utils/formatError.js";
import type { CommunityClient } from "./CommunityClient.js";

export function registerCommunityModerationHandler(
  client: CommunityClient,
): void {
  client.on(Events.MessageCreate, async (message) => {
    if (!message.inGuild()) return;
    const violation = client.automod.inspect(message);
    if (!violation || !message.member) return;

    try {
      await message.delete();
      await client.moderation.applyAutomod(
        message.guild,
        message.member,
        violation,
        message.channelId,
        message.id,
      );
    } catch (error: unknown) {
      logger.error(
        `Community automod failed for message ${message.id}:\n${formatError(error)}`,
      );
    }
  });
}
