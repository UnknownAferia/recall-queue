import "dotenv/config";

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const directory = resolve(process.env.VORA_BACKUP_DIRECTORY?.trim() || "backups");
const argument = process.argv[2];
const candidates = existsSync(directory)
  ? readdirSync(directory)
      .filter((name) => name.endsWith(".archive.gz"))
      .map((name) => resolve(directory, name))
      .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)
  : [];
const archivePath = argument ? resolve(argument) : candidates[0];

if (!archivePath || !existsSync(archivePath) || !statSync(archivePath).isFile()) {
  throw new Error("No MongoDB backup archive is available for verification.");
}

const stats = statSync(archivePath);
if (stats.size < 128) {
  throw new Error(`Backup archive is unexpectedly small (${stats.size} bytes).`);
}

const signature = readFileSync(archivePath).subarray(0, 2);
if (signature[0] !== 0x1f || signature[1] !== 0x8b) {
  throw new Error("Backup archive does not have a valid gzip signature.");
}

const maxAgeMs = Number(process.env.VORA_BACKUP_MAX_AGE_MS || 86_400_000);
const ageMs = Date.now() - stats.mtimeMs;
if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
  throw new Error("VORA_BACKUP_MAX_AGE_MS must be a positive number.");
}
if (ageMs > maxAgeMs) {
  throw new Error(`Latest backup is too old (${Math.round(ageMs / 3_600_000)} hours).`);
}

console.log(`Backup verified: ${archivePath} (${stats.size} bytes)`);
