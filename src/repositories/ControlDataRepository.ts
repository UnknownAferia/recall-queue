import { CommunityModerationCaseModel } from "../models/CommunityModerationCaseModel.js";
import { CommunityReportModel } from "../models/CommunityReportModel.js";
import { PlayerModel } from "../models/PlayerModel.js";
import { ServiceHeartbeatModel } from "../models/ServiceHeartbeatModel.js";
import { SupportTicketModel } from "../models/SupportTicketModel.js";

export interface ControlDataSnapshot {
  readonly registeredPlayers: number;
  readonly verifiedPlayers: number;
  readonly pendingVerification: number;
  readonly rejectedVerification: number;
  readonly openReports: number;
  readonly pendingCases: number;
  readonly openTickets: number;
  readonly communityHeartbeatAt: Date | null;
}

export class ControlDataRepository {
  public async getSnapshot(guildId: string): Promise<ControlDataSnapshot> {
    const [
      registeredPlayers,
      verifiedPlayers,
      pendingVerification,
      rejectedVerification,
      openReports,
      pendingCases,
      openTickets,
      communityHeartbeat,
    ] = await Promise.all([
      PlayerModel.countDocuments({}).exec(),
      PlayerModel.countDocuments({
        $or: [
          {
            "verification.status": {
              $in: ["verified", "legacy_verified"],
            },
          },
          { verification: { $exists: false } },
        ],
      }).exec(),
      PlayerModel.countDocuments({
        "verification.status": "pending",
      }).exec(),
      PlayerModel.countDocuments({
        "verification.status": "rejected",
      }).exec(),
      CommunityReportModel.countDocuments({
        guildId,
        status: "open",
      }).exec(),
      CommunityModerationCaseModel.countDocuments({
        guildId,
        status: "pending",
      }).exec(),
      SupportTicketModel.countDocuments({
        guildId,
        status: "open",
      }).exec(),
      ServiceHeartbeatModel.findOne({ service: "community" }).lean().exec(),
    ]);

    return {
      registeredPlayers,
      verifiedPlayers,
      pendingVerification,
      rejectedVerification,
      openReports,
      pendingCases,
      openTickets,
      communityHeartbeatAt: communityHeartbeat?.heartbeatAt
        ? new Date(communityHeartbeat.heartbeatAt)
        : null,
    };
  }
}
