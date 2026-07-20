import "dotenv/config";

import { logger } from "../config/logger.js";
import { disconnectFromMongoDB } from "../database/mongoose.js";
import { formatError } from "../utils/formatError.js";
import { bootstrapCommunity } from "./bootstrapCommunity.js";
import { CommunityClient } from "./CommunityClient.js";
import { CommunityPanelJobs } from "./jobs/CommunityPanelJobs.js";

const client = new CommunityClient();
const jobs = new CommunityPanelJobs(client);

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Shutting down Vora Community...`);

  try {
    jobs.stop();
    client.heartbeat.stop();
    client.destroy();
    await disconnectFromMongoDB();

    logger.info("Vora Community shut down successfully.");
    process.exitCode = 0;
  } catch (error: unknown) {
    logger.error(`Community shutdown failed:\n${formatError(error)}`);
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

await bootstrapCommunity(client, jobs);
