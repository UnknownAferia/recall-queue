import "dotenv/config";

import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { parse, resolve } from "node:path";

const backupDirectory = resolve(
  process.env.VORA_BACKUP_DIRECTORY?.trim() || "backups",
);
const retentionDays = Number(
  process.env.VORA_BACKUP_RETENTION_DAYS?.trim() || "14",
);

if (backupDirectory === parse(backupDirectory).root) {
  throw new Error("Refusing to prune backups from a filesystem root.");
}

if (!Number.isInteger(retentionDays) || retentionDays < 2) {
  throw new Error("VORA_BACKUP_RETENTION_DAYS must be an integer of at least 2.");
}

if (!existsSync(backupDirectory)) {
  console.log(`Backup directory does not exist yet: ${backupDirectory}`);
  process.exit(0);
}

const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1_000;
const archives = readdirSync(backupDirectory)
  .filter((name) => /^vora-.+\.archive\.gz$/.test(name))
  .map((name) => {
    const path = resolve(backupDirectory, name);
    const stats = statSync(path);

    return { path, stats };
  })
  .filter(({ stats }) => stats.isFile())
  .sort((left, right) => right.stats.mtimeMs - left.stats.mtimeMs);

let removed = 0;

for (const [index, archive] of archives.entries()) {
  // Always retain the newest valid archive, even if the configured clock is wrong.
  if (index === 0 || archive.stats.mtimeMs >= cutoff) {
    continue;
  }

  unlinkSync(archive.path);
  removed += 1;
}

console.log(
  `Backup retention completed: ${removed} archive(s) removed, ${archives.length - removed} retained.`,
);
