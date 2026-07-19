import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { RecallClient } from "../client/RecallClient.js";
import { logger } from "../config/logger.js";
import type { Modal } from "../interfaces/Modal.js";

interface ModalModule {
  default: Modal;
}

function isModal(value: unknown): value is Modal {
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

async function findModalFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const currentExtension = extname(fileURLToPath(import.meta.url));
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findModalFiles(entryPath)));
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

export async function loadModals(
  client: RecallClient,
): Promise<void> {
  client.modals.clear();

  const modalsDirectory = fileURLToPath(
    new URL("../modals", import.meta.url),
  );

  const modalFiles = await findModalFiles(modalsDirectory);

  for (const modalFile of modalFiles) {
    const moduleUrl = pathToFileURL(modalFile).href;
    const importedModule = (await import(moduleUrl)) as Partial<ModalModule>;
    const modal = importedModule.default;

    if (!isModal(modal)) {
      throw new Error(
        `Invalid modal module: ${modalFile}. A default export with customId and execute is required.`,
      );
    }

    if (client.modals.has(modal.customId)) {
      throw new Error(
        `Duplicate modal custom ID detected: ${modal.customId}`,
      );
    }

    client.modals.set(modal.customId, modal);

    logger.info(`Loaded modal: ${modal.customId}`);
  }

  logger.info(`Loaded ${client.modals.size} modal(s).`);
}