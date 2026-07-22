import "dotenv/config";

import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { runMongoTool } from "./mongodb-tool-process.mjs";

const archiveArgument = process.argv[2];
const uri = process.env.MONGODB_URI?.trim();
const database = process.env.MONGODB_DATABASE?.trim();

if (!archiveArgument || !uri || !database) {
  throw new Error(
    "Usage: npm run restore -- <archive.gz>. MONGODB_URI and MONGODB_DATABASE are required.",
  );
}

if (process.env.VORA_RESTORE_CONFIRM !== database) {
  throw new Error(
    `Set VORA_RESTORE_CONFIRM=${database} for this one restore operation.`,
  );
}

const archivePath = resolve(archiveArgument);

if (!existsSync(archivePath) || !statSync(archivePath).isFile()) {
  throw new Error(`Backup archive does not exist: ${archivePath}`);
}

const result = runMongoTool(
  "mongorestore",
  [
    `--uri=${uri}`,
    `--nsInclude=${database}.*`,
    `--archive=${archivePath}`,
    "--gzip",
    "--drop",
  ],
  uri,
);

if (result.error) {
  throw new Error(
    `Unable to start mongorestore. Install MongoDB Database Tools. ${result.error.message}`,
  );
}

if (result.status !== 0) {
  throw new Error(`mongorestore exited with status ${result.status}.`);
}

console.log(`Restore completed from ${archivePath}.`);
