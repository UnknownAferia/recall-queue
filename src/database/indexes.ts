import { logger } from "../config/logger.js";
import { CommunityPanelModel } from "../models/CommunityPanelModel.js";
import { ModerationAuditModel } from "../models/ModerationAuditModel.js";
import { PlayerModel } from "../models/PlayerModel.js";
import { QueueModel } from "../models/QueueModel.js";
import { SquadModel } from "../models/SquadModel.js";
import { ServiceHeartbeatModel } from "../models/ServiceHeartbeatModel.js";
import { SupportTicketModel } from "../models/SupportTicketModel.js";

export async function synchronizeDatabaseIndexes(): Promise<void> {
  logger.info("Synchronizing database indexes...");

  await Promise.all([
    CommunityPanelModel.syncIndexes(),
    ModerationAuditModel.syncIndexes(),
    PlayerModel.syncIndexes(),
    QueueModel.syncIndexes(),
    SquadModel.syncIndexes(),
    ServiceHeartbeatModel.syncIndexes(),
    SupportTicketModel.syncIndexes(),
  ]);

  logger.info("Database indexes synchronized.");
}
