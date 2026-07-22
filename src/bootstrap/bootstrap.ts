import { Events } from "discord.js";

import type { VoraClient } from "../client/VoraClient.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { initializeDatabase } from "../database/database.js";
import { loadButtons } from "../handlers/loadButtons.js";
import { loadCommands } from "../handlers/loadCommands.js";
import { loadModals } from "../handlers/loadModals.js";
import { loadStringSelectMenus } from "../handlers/loadStringSelectMenus.js";
import { registerInteractionHandler } from "../handlers/registerInteractionHandler.js";
import { registerVoiceQueueHandler } from "../handlers/registerVoiceQueueHandler.js";
import { registerSquadVoiceHandler } from "../handlers/registerSquadVoiceHandler.js";
import { startReadyCheckExpirationJob } from "../jobs/readyCheckExpirationJob.js";
import { startResultLifecycleExpirationJob } from "../jobs/resultLifecycleExpirationJob.js";
import { formatError } from "../utils/formatError.js";
import { ServiceHeartbeatService } from "../services/ServiceHeartbeatService.js";

export async function bootstrap(client: VoraClient): Promise<void> {
  try {
    logger.info("Starting Vora...");

    await initializeDatabase();
    await loadCommands(client);
    await loadButtons(client);
    await loadModals(client);
    await loadStringSelectMenus(client);

    registerInteractionHandler(client);
    registerVoiceQueueHandler(client);
    registerSquadVoiceHandler(client);
    startReadyCheckExpirationJob(client);
    startResultLifecycleExpirationJob(client);

    const heartbeat = new ServiceHeartbeatService("core");

    client.once(Events.ClientReady, (readyClient) => {
      void heartbeat
        .start()
        .then(() => {
          logger.info(`Logged in as ${readyClient.user.tag}`);
        })
        .catch((error: unknown) => {
          logger.error(`Core heartbeat failed:\n${formatError(error)}`);
        });
    });

    await client.login(env.discordToken);
  } catch (error: unknown) {
    logger.error(`Bootstrap failed:\n${formatError(error)}`);

    process.exitCode = 1;
  }
}
