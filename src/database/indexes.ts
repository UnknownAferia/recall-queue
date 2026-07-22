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
import { PlayerAdministrationOperationModel } from "../models/PlayerAdministrationOperationModel.js";
import { OperationalStateModel } from "../models/OperationalStateModel.js";

const ManagedModels = [
  CommunityPanelModel,
  ModerationAuditModel,
  PlayerModel,
  QueueModel,
  SquadModel,
  ServiceHeartbeatModel,
  SupportTicketModel,
  SeasonModel,
  SeasonMembershipModel,
  OperationalAuditModel,
  CommunityModerationCaseModel,
  CommunityModerationCounterModel,
  CommunityReportModel,
  PlayerVerificationModel,
  PlayerAdministrationOperationModel,
  OperationalStateModel,
] as const;

export interface DatabaseIndexAudit {
  readonly models: number;
  readonly missingIndexes: number;
  readonly obsoleteIndexes: number;
}

export async function auditDatabaseIndexes(): Promise<DatabaseIndexAudit> {
  const differences = await Promise.all(
    ManagedModels.map((model) => model.diffIndexes()),
  );
  return {
    models: ManagedModels.length,
    missingIndexes: differences.reduce(
      (sum, difference) => sum + difference.toCreate.length,
      0,
    ),
    obsoleteIndexes: differences.reduce(
      (sum, difference) => sum + difference.toDrop.length,
      0,
    ),
  };
}

export async function synchronizeDatabaseIndexes(): Promise<void> {
  logger.info("Synchronizing database indexes...");

  await Promise.all(ManagedModels.map((model) => model.syncIndexes()));

  logger.info("Database indexes synchronized.");
}
