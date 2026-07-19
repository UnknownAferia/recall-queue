import { logger } from "../config/logger.js";
import { PlayerModel } from "../models/PlayerModel.js";
import { QueueModel } from "../models/QueueModel.js";

export async function synchronizeDatabaseIndexes(): Promise<void> {
  logger.info("Synchronizing database indexes...");

  await Promise.all([
    PlayerModel.syncIndexes(),
    QueueModel.syncIndexes(),
  ]);

  logger.info("Database indexes synchronized.");
}