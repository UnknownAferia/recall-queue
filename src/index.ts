import "dotenv/config";

import { bootstrap } from "./bootstrap/bootstrap.js";
import { VoraClient } from "./client/VoraClient.js";
import { logger } from "./config/logger.js";
import { disconnectFromMongoDB } from "./database/mongoose.js";
import { formatError } from "./utils/formatError.js";

const client = new VoraClient();

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Shutting down Vora...`);

  try {
    client.destroy();
    await disconnectFromMongoDB();

    logger.info("Vora shut down successfully.");
    process.exitCode = 0;
  } catch (error: unknown) {
    logger.error(`Shutdown failed:\n${formatError(error)}`);
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

await bootstrap(client);