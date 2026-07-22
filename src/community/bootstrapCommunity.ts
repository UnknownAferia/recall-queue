import { Events } from "discord.js";

import { logger } from "../config/logger.js";
import { initializeDatabase } from "../database/database.js";
import { formatError } from "../utils/formatError.js";
import type { CommunityClient } from "./CommunityClient.js";
import { communityEnv } from "./config/communityEnv.js";
import { CommunityPanelJobs } from "./jobs/CommunityPanelJobs.js";
import { registerCommunityInteractionHandler } from "./registerCommunityInteractionHandler.js";
import { registerCommunityModerationHandler } from "./registerCommunityModerationHandler.js";

export async function bootstrapCommunity(
  client: CommunityClient,
  jobs: CommunityPanelJobs,
): Promise<void> {
  try {
    logger.info("Starting Vora Community...");

    await initializeDatabase();
    registerCommunityInteractionHandler(client);
    registerCommunityModerationHandler(client);

    client.once(Events.ClientReady, async (readyClient) => {
      try {
        await client.heartbeat.start();
        await jobs.start();
        logger.info(`Vora Community logged in as ${readyClient.user.tag}`);
      } catch (error: unknown) {
        logger.error(
          `Vora Community startup jobs failed:\n${formatError(error)}`,
        );
      }
    });

    await client.login(communityEnv.discordToken);
  } catch (error: unknown) {
    logger.error(`Vora Community bootstrap failed:\n${formatError(error)}`);
    process.exitCode = 1;
  }
}
