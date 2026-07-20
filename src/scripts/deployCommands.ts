import "dotenv/config";

import {
  REST,
  Routes,
  type RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";

import { VoraClient } from "../client/VoraClient.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { loadCommands } from "../handlers/loadCommands.js";
import { formatError } from "../utils/formatError.js";

async function deployCommands(): Promise<void> {
  const client = new VoraClient();

  await loadCommands(client);

  const commandData: RESTPostAPIApplicationCommandsJSONBody[] =
    client.commands.map((command) => command.data.toJSON());

  const rest = new REST({
    version: "10",
  }).setToken(env.discordToken);

  if (env.discordGuildIds.length > 0) {
    for (const guildId of env.discordGuildIds) {
      logger.info(
        `Deploying ${commandData.length} guild command(s) to ${guildId}...`,
      );

      await rest.put(
        Routes.applicationGuildCommands(env.discordClientId, guildId),
        {
          body: commandData,
        },
      );

      logger.info(`Guild commands deployed successfully to ${guildId}.`);
    }

    return;
  }

  logger.warn(
    "DISCORD_GUILD_IDS is missing. Commands will be deployed globally.",
  );

  await rest.put(
    Routes.applicationCommands(env.discordClientId),
    {
      body: commandData,
    },
  );

  logger.info("Global commands deployed successfully.");
}

try {
  await deployCommands();
} catch (error: unknown) {
  logger.error(`Command deployment failed:\n${formatError(error)}`);
  process.exitCode = 1;
}
