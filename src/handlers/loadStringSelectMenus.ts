import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { VoraClient } from "../client/VoraClient.js";
import { logger } from "../config/logger.js";
import type { StringSelectMenu } from "../interfaces/StringSelectMenu.js";

interface StringSelectMenuModule {
  default: StringSelectMenu;
}

function isStringSelectMenu(
  value: unknown,
): value is StringSelectMenu {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as {
    customId?: unknown;
    execute?: unknown;
  };

  return (
    typeof candidate.customId === "string" &&
    candidate.customId.length > 0 &&
    typeof candidate.execute === "function"
  );
}

async function findStringSelectMenuFiles(
  directory: string,
): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const currentExtension = extname(
    fileURLToPath(import.meta.url),
  );

  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(
        ...(await findStringSelectMenuFiles(entryPath)),
      );

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

export async function loadStringSelectMenus(
  client: VoraClient,
): Promise<void> {
  client.stringSelectMenus.clear();

  const selectMenusDirectory = fileURLToPath(
    new URL("../selectMenus", import.meta.url),
  );

  const selectMenuFiles =
    await findStringSelectMenuFiles(selectMenusDirectory);

  for (const selectMenuFile of selectMenuFiles) {
    const moduleUrl = pathToFileURL(selectMenuFile).href;

    const importedModule = (await import(
      moduleUrl
    )) as Partial<StringSelectMenuModule>;

    const selectMenu = importedModule.default;

    if (!isStringSelectMenu(selectMenu)) {
      throw new Error(
        `Invalid string select menu module: ${selectMenuFile}. ` +
          "A default export with customId and execute is required.",
      );
    }

    if (client.stringSelectMenus.has(selectMenu.customId)) {
      throw new Error(
        `Duplicate string select menu custom ID detected: ${selectMenu.customId}`,
      );
    }

    client.stringSelectMenus.set(
      selectMenu.customId,
      selectMenu,
    );

    logger.info(
      `Loaded string select menu: ${selectMenu.customId}`,
    );
  }

  logger.info(
    `Loaded ${client.stringSelectMenus.size} string select menu(s).`,
  );
}