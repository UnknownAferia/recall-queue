import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { Command } from "../interfaces/Command.js";
import type { VoraClient } from "../client/VoraClient.js";
import { logger } from "../config/logger.js";

interface CommandModule {
  default: Command;
}

function isCommand(value: unknown): value is Command {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as {
    data?: {
      name?: unknown;
      toJSON?: unknown;
    };
    execute?: unknown;
  };

  return (
    typeof candidate.data?.name === "string" &&
    typeof candidate.data.toJSON === "function" &&
    typeof candidate.execute === "function"
  );
}

async function findCommandFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const currentExtension = extname(fileURLToPath(import.meta.url));
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findCommandFiles(entryPath)));
      continue;
    }

    if (
      entry.isFile() &&
      extname(entry.name) === currentExtension &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(entryPath);
    }
  }

  return files;
}

export async function loadCommands(client: VoraClient): Promise<void> {
  client.commands.clear();

  const commandsDirectory = fileURLToPath(
    new URL("../commands", import.meta.url),
  );

  const commandFiles = await findCommandFiles(commandsDirectory);

  for (const commandFile of commandFiles) {
    const moduleUrl = pathToFileURL(commandFile).href;
    const importedModule = (await import(moduleUrl)) as Partial<CommandModule>;
    const command = importedModule.default;

    if (!isCommand(command)) {
      throw new Error(
        `Invalid command module: ${commandFile}. A default export with data and execute is required.`,
      );
    }

    if (command.enabled === false) {
      logger.info(`Skipped disabled command: /${command.data.name}`);
      continue;
    }

    if (client.commands.has(command.data.name)) {
      throw new Error(`Duplicate command name detected: ${command.data.name}`);
    }

    client.commands.set(command.data.name, command);

    logger.info(`Loaded command: /${command.data.name}`);
  }

  logger.info(`Loaded ${client.commands.size} command(s).`);
}
