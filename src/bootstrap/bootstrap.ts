import { Events } from "discord.js";

import type { RecallClient } from "../client/RecallClient.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { initializeDatabase } from "../database/database.js";
import { loadButtons } from "../handlers/loadButtons.js";
import { loadCommands } from "../handlers/loadCommands.js";
import { loadModals } from "../handlers/loadModals.js";
import { registerInteractionHandler } from "../handlers/registerInteractionHandler.js";
import { formatError } from "../utils/formatError.js";

export async function bootstrap(
  client: RecallClient,
): Promise<void> {
  try {
    logger.info("Starting RecallQ...");

    await initializeDatabase();
    await loadCommands(client);
    await loadButtons(client);
    await loadModals(client);

    registerInteractionHandler(client);

    client.once(Events.ClientReady, (readyClient) => {
      logger.info(`Logged in as ${readyClient.user.tag}`);
    });

    await client.login(env.discordToken);
  } catch (error: unknown) {
    logger.error(`Bootstrap failed:\n${formatError(error)}`);
    process.exitCode = 1;
  }
}