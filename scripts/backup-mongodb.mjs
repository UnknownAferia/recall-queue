import "dotenv/config";

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const uri = process.env.MONGODB_URI?.trim();
const database = process.env.MONGODB_DATABASE?.trim();
const backupDirectory = resolve(
  process.env.VORA_BACKUP_DIRECTORY?.trim() || "backups",
);

if (!uri || !database) {
  throw new Error("MONGODB_URI and MONGODB_DATABASE are required.");
}

mkdirSync(backupDirectory, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const archivePath = resolve(
  backupDirectory,
  `vora-${database}-${timestamp}.archive.gz`,
);
const result = spawnSync(
  "mongodump",
  [`--uri=${uri}`, `--db=${database}`, `--archive=${archivePath}`, "--gzip"],
  { stdio: "inherit", windowsHide: true },
);

if (result.error) {
  throw new Error(
    `Unable to start mongodump. Install MongoDB Database Tools. ${result.error.message}`,
  );
}

if (result.status !== 0) {
  throw new Error(`mongodump exited with status ${result.status}.`);
}

console.log(`Backup completed: ${archivePath}`);
