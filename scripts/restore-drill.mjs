import "dotenv/config";

import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import mongoose from "mongoose";

const archiveArgument = process.argv[2];
const uri = process.env.MONGODB_URI?.trim();
const productionDatabase = process.env.MONGODB_DATABASE?.trim();
const drillDatabase = process.env.VORA_RESTORE_DRILL_DATABASE?.trim();

if (!archiveArgument || !uri || !productionDatabase || !drillDatabase) {
  throw new Error(
    "Usage: npm run restore:drill -- <archive.gz>. Configure MONGODB_URI, MONGODB_DATABASE and VORA_RESTORE_DRILL_DATABASE.",
  );
}
if (
  drillDatabase === productionDatabase ||
  !/(?:drill|test|sandbox)/i.test(drillDatabase)
) {
  throw new Error("The restore-drill database must be separate and contain drill, test or sandbox in its name.");
}

const archivePath = resolve(archiveArgument);
if (!existsSync(archivePath) || !statSync(archivePath).isFile()) {
  throw new Error(`Backup archive does not exist: ${archivePath}`);
}

const restored = spawnSync(
  "mongorestore",
  [
    `--uri=${uri}`,
    `--archive=${archivePath}`,
    "--gzip",
    "--drop",
    `--nsFrom=${productionDatabase}.*`,
    `--nsTo=${drillDatabase}.*`,
  ],
  { stdio: "inherit", windowsHide: true },
);

if (restored.error) {
  throw new Error(`Unable to start mongorestore. ${restored.error.message}`);
}
if (restored.status !== 0) {
  throw new Error(`Restore drill exited with status ${restored.status}.`);
}

await mongoose.connect(uri, { dbName: drillDatabase, serverSelectionTimeoutMS: 10_000 });
try {
  const database = mongoose.connection.db;
  if (!database) throw new Error("Restore drill database connection is unavailable.");
  const collections = await database.listCollections().toArray();
  if (collections.length === 0) throw new Error("Restore drill produced no collections.");
  const counts = await Promise.all(
    collections.map(async ({ name }) => ({
      name,
      count: await database.collection(name).estimatedDocumentCount(),
    })),
  );
  console.log(`Restore drill verified ${collections.length} collection(s):`);
  for (const entry of counts) console.log(`- ${entry.name}: ${entry.count}`);
  const cleanupFailures = [];

  for (const { name } of collections) {
    try {
      await database.collection(name).drop();
    } catch (error) {
      cleanupFailures.push(
        `${name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (cleanupFailures.length > 0) {
    throw new Error(
      [
        "Restore drill passed, but temporary collection cleanup was incomplete.",
        ...cleanupFailures,
        `Remove the remaining ${drillDatabase} collections in MongoDB Atlas.`,
      ].join("\n"),
    );
  }

  console.log(
    `Temporary drill database ${drillDatabase} was emptied safely (${collections.length} collections removed).`,
  );
} finally {
  await mongoose.disconnect();
}
