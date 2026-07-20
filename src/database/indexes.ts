import { logger } from "../config/logger.js";
import { ModerationAuditModel } from "../models/ModerationAuditModel.js";
import { PlayerModel } from "../models/PlayerModel.js";
import { QueueModel } from "../models/QueueModel.js";
import { SquadModel } from "../models/SquadModel.js";

export async function synchronizeDatabaseIndexes(): Promise<void> {
  logger.info("Synchronizing database indexes...");

  await Promise.all([
    ModerationAuditModel.syncIndexes(),
    PlayerModel.syncIndexes(),
    QueueModel.syncIndexes(),
    SquadModel.syncIndexes(),
  ]);

  logger.info("Database indexes synchronized.");
}
