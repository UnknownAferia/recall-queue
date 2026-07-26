import { Events } from "discord.js";

import { logger } from "../config/logger.js";
import { formatError } from "../utils/formatError.js";
import type { CommunityClient } from "./CommunityClient.js";

export function registerCommunityOnboardingHandler(
  client: CommunityClient,
): void {
  client.on(Events.GuildMemberAdd, async (member) => {
    try {
      await client.onboarding.welcome(member);
    } catch (error: unknown) {
      logger.warn(
        `Unable to process onboarding for ${member.user.id} in guild ${member.guild.id}:\n${formatError(error)}`,
      );
    }
  });
}
