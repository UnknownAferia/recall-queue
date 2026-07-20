import "dotenv/config";

import { REST, Routes } from "discord.js";

import { logger } from "../../config/logger.js";
import { formatError } from "../../utils/formatError.js";
import { publishCommunityCommandData } from "../commands/publishCommunity.js";
import { communityEnv } from "../config/communityEnv.js";

async function deployCommunityCommands(): Promise<void> {
  const commandData = [publishCommunityCommandData.toJSON()];
  const rest = new REST({ version: "10" }).setToken(communityEnv.discordToken);

  if (communityEnv.discordGuildIds.length > 0) {
    for (const guildId of communityEnv.discordGuildIds) {
      logger.info(
        `Deploying ${commandData.length} Community command(s) to ${guildId}...`,
      );
      await rest.put(
        Routes.applicationGuildCommands(communityEnv.discordClientId, guildId),
        { body: commandData },
      );
      logger.info(`Community commands deployed successfully to ${guildId}.`);
    }
    return;
  }

  logger.warn(
    "DISCORD_GUILD_IDS is missing. Community commands will be deployed globally.",
  );
  await rest.put(Routes.applicationCommands(communityEnv.discordClientId), {
    body: commandData,
  });
  logger.info("Global Community commands deployed successfully.");
}

try {
  await deployCommunityCommands();
} catch (error: unknown) {
  logger.error(`Community command deployment failed:\n${formatError(error)}`);
  process.exitCode = 1;
}
