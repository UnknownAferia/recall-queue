import { CommunityModerationCaseModel } from "../models/CommunityModerationCaseModel.js";
import { CommunityReportModel } from "../models/CommunityReportModel.js";
import { PlayerModel } from "../models/PlayerModel.js";
import { ServiceHeartbeatModel } from "../models/ServiceHeartbeatModel.js";
import { SquadModel } from "../models/SquadModel.js";
import { SupportTicketModel } from "../models/SupportTicketModel.js";

export interface ControlDataTrendComparison {
  readonly current: number;
  readonly previous: number;
}

export interface ControlDataSnapshot {
  readonly registeredPlayers: number;
  readonly verifiedPlayers: number;
  readonly pendingVerification: number;
  readonly rejectedVerification: number;
  readonly pendingOlderThan48Hours: number;
  readonly openReports: number;
  readonly pendingCases: number;
  readonly openTickets: number;
  readonly communityHeartbeatAt: Date | null;
  readonly trends: {
    readonly registrations: ControlDataTrendComparison;
    readonly verificationSubmissions: ControlDataTrendComparison;
    readonly verificationApprovals: ControlDataTrendComparison;
    readonly squadsFormed: ControlDataTrendComparison;
    readonly verifiedResults: ControlDataTrendComparison;
    readonly reportsOpened: ControlDataTrendComparison;
    readonly ticketsOpened: ControlDataTrendComparison;
  };
}

const trendPeriodMs = 7 * 24 * 60 * 60 * 1_000;
const pendingVerificationAttentionMs = 48 * 60 * 60 * 1_000;

function dateRange(
  start: Date,
  end: Date,
): {
  readonly $gte: Date;
  readonly $lt: Date;
} {
  return { $gte: start, $lt: end };
}

export class ControlDataRepository {
  public async getSnapshot(
    guildId: string,
    now = new Date(),
  ): Promise<ControlDataSnapshot> {
    const currentStart = new Date(now.getTime() - trendPeriodMs);
    const previousStart = new Date(currentStart.getTime() - trendPeriodMs);
    const currentRange = dateRange(currentStart, now);
    const previousRange = dateRange(previousStart, currentStart);
    const pendingAttentionBefore = new Date(
      now.getTime() - pendingVerificationAttentionMs,
    );

    const [
      registeredPlayers,
      verifiedPlayers,
      pendingVerification,
      rejectedVerification,
      pendingOlderThan48Hours,
      openReports,
      pendingCases,
      openTickets,
      communityHeartbeat,
      registrationsCurrent,
      registrationsPrevious,
      submissionsCurrent,
      submissionsPrevious,
      approvalsCurrent,
      approvalsPrevious,
      squadsCurrent,
      squadsPrevious,
      resultsCurrent,
      resultsPrevious,
      reportsCurrent,
      reportsPrevious,
      ticketsCurrent,
      ticketsPrevious,
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
      PlayerModel.countDocuments({
        "verification.status": "pending",
        "verification.submittedAt": { $lte: pendingAttentionBefore },
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
      PlayerModel.countDocuments({ createdAt: currentRange }).exec(),
      PlayerModel.countDocuments({ createdAt: previousRange }).exec(),
      PlayerModel.countDocuments({
        "verification.submittedAt": currentRange,
      }).exec(),
      PlayerModel.countDocuments({
        "verification.submittedAt": previousRange,
      }).exec(),
      PlayerModel.countDocuments({
        "verification.status": "verified",
        "verification.reviewedAt": currentRange,
      }).exec(),
      PlayerModel.countDocuments({
        "verification.status": "verified",
        "verification.reviewedAt": previousRange,
      }).exec(),
      SquadModel.countDocuments({
        guildId,
        createdAt: currentRange,
      }).exec(),
      SquadModel.countDocuments({
        guildId,
        createdAt: previousRange,
      }).exec(),
      SquadModel.countDocuments({
        guildId,
        "result.verifiedAt": currentRange,
      }).exec(),
      SquadModel.countDocuments({
        guildId,
        "result.verifiedAt": previousRange,
      }).exec(),
      CommunityReportModel.countDocuments({
        guildId,
        createdAt: currentRange,
      }).exec(),
      CommunityReportModel.countDocuments({
        guildId,
        createdAt: previousRange,
      }).exec(),
      SupportTicketModel.countDocuments({
        guildId,
        createdAt: currentRange,
      }).exec(),
      SupportTicketModel.countDocuments({
        guildId,
        createdAt: previousRange,
      }).exec(),
    ]);

    return {
      registeredPlayers,
      verifiedPlayers,
      pendingVerification,
      rejectedVerification,
      pendingOlderThan48Hours,
      openReports,
      pendingCases,
      openTickets,
      communityHeartbeatAt: communityHeartbeat?.heartbeatAt
        ? new Date(communityHeartbeat.heartbeatAt)
        : null,
      trends: {
        registrations: {
          current: registrationsCurrent,
          previous: registrationsPrevious,
        },
        verificationSubmissions: {
          current: submissionsCurrent,
          previous: submissionsPrevious,
        },
        verificationApprovals: {
          current: approvalsCurrent,
          previous: approvalsPrevious,
        },
        squadsFormed: {
          current: squadsCurrent,
          previous: squadsPrevious,
        },
        verifiedResults: {
          current: resultsCurrent,
          previous: resultsPrevious,
        },
        reportsOpened: {
          current: reportsCurrent,
          previous: reportsPrevious,
        },
        ticketsOpened: {
          current: ticketsCurrent,
          previous: ticketsPrevious,
        },
      },
    };
  }
}
