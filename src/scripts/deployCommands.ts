import "dotenv/config";

import {
  REST,
  Routes,
  type RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js";

import { RecallClient } from "../client/RecallClient.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { loadCommands } from "../handlers/loadCommands.js";
import { formatError } from "../utils/formatError.js";

async function deployCommands(): Promise<void> {
  const client = new RecallClient();

  await loadCommands(client);

  const commandData: RESTPostAPIApplicationCommandsJSONBody[] =
    client.commands.map((command) => command.data.toJSON());

  const rest = new REST({
    version: "10",
  }).setToken(env.discordToken);

  if (env.discordGuildId) {
    logger.info(
      `Deploying ${commandData.length} guild command(s) to ${env.discordGuildId}...`,
    );

    await rest.put(
      Routes.applicationGuildCommands(
        env.discordClientId,
        env.discordGuildId,
      ),
      {
        body: commandData,
      },
    );

    logger.info("Guild commands deployed successfully.");
    return;
  }

  logger.warn(
    "DISCORD_GUILD_ID is missing. Commands will be deployed globally.",
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