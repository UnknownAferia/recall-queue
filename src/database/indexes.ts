import { logger } from "../config/logger.js";
import { CommunityPanelModel } from "../models/CommunityPanelModel.js";
import { ModerationAuditModel } from "../models/ModerationAuditModel.js";
import { PlayerModel } from "../models/PlayerModel.js";
import { QueueModel } from "../models/QueueModel.js";
import { SquadModel } from "../models/SquadModel.js";
import { ServiceHeartbeatModel } from "../models/ServiceHeartbeatModel.js";
import { SupportTicketModel } from "../models/SupportTicketModel.js";
import { SeasonMembershipModel } from "../models/SeasonMembershipModel.js";
import { SeasonModel } from "../models/SeasonModel.js";
import { OperationalAuditModel } from "../models/OperationalAuditModel.js";
import { CommunityModerationCaseModel } from "../models/CommunityModerationCaseModel.js";
import { CommunityModerationCounterModel } from "../models/CommunityModerationCounterModel.js";
import { CommunityReportModel } from "../models/CommunityReportModel.js";
import { PlayerVerificationModel } from "../models/PlayerVerificationModel.js";

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
    SeasonModel.syncIndexes(),
    SeasonMembershipModel.syncIndexes(),
    OperationalAuditModel.syncIndexes(),
    CommunityModerationCaseModel.syncIndexes(),
    CommunityModerationCounterModel.syncIndexes(),
    CommunityReportModel.syncIndexes(),
    PlayerVerificationModel.syncIndexes(),
  ]);

  logger.info("Database indexes synchronized.");
}
