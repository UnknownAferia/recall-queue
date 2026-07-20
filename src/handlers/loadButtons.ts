import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { VoraClient } from "../client/VoraClient.js";
import { logger } from "../config/logger.js";
import type { Button } from "../interfaces/Button.js";

interface ButtonModule {
  default: Button;
}

function isButton(value: unknown): value is Button {
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

async function findButtonFiles(
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
      files.push(...(await findButtonFiles(entryPath)));
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

export async function loadButtons(
  client: VoraClient,
): Promise<void> {
  client.buttons.clear();

  const buttonsDirectory = fileURLToPath(
    new URL("../buttons", import.meta.url),
  );

  const buttonFiles = await findButtonFiles(buttonsDirectory);

  for (const buttonFile of buttonFiles) {
    const moduleUrl = pathToFileURL(buttonFile).href;

    const importedModule = (await import(
      moduleUrl
    )) as Partial<ButtonModule>;

    const button = importedModule.default;

    if (!isButton(button)) {
      throw new Error(
        `Invalid button module: ${buttonFile}. A default export with customId and execute is required.`,
      );
    }

    if (client.buttons.has(button.customId)) {
      throw new Error(
        `Duplicate button custom ID detected: ${button.customId}`,
      );
    }

    client.buttons.set(button.customId, button);

    logger.info(`Loaded button: ${button.customId}`);
  }

  logger.info(`Loaded ${client.buttons.size} button(s).`);
}