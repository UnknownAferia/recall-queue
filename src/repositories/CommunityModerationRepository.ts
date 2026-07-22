import type {
  CommunityModerationAction,
  CommunityModerationCaseStatus,
  CommunityModerationSource,
  CommunityReportStatus,
  CommunityReportType,
} from "../constants/communityModeration.js";
import { CommunityModerationCaseModel } from "../models/CommunityModerationCaseModel.js";
import { CommunityModerationCounterModel } from "../models/CommunityModerationCounterModel.js";
import {
  CommunityReportModel,
  type CommunityReportDocument,
} from "../models/CommunityReportModel.js";
import type { CommunityModerationCaseDocument } from "../models/CommunityModerationCaseModel.js";
import type {
  CommunityModerationCaseDetails,
  CommunityReportEvidence,
} from "../types/communityModeration.js";

export interface CreateCommunityCaseInput {
  readonly guildId: string;
  readonly source: CommunityModerationSource;
  readonly action: CommunityModerationAction;
  readonly status: CommunityModerationCaseStatus;
  readonly actorDiscordId: string | null;
  readonly targetDiscordId: string | null;
  readonly reason: string;
  readonly durationMs?: number | null;
  readonly expiresAt?: Date | null;
  readonly pendingUntil?: Date | null;
  readonly relatedReportId?: string | null;
  readonly channelId?: string | null;
  readonly messageId?: string | null;
  readonly details?: CommunityModerationCaseDetails;
  readonly purgeAt?: Date | null;
}

export interface CreateCommunityReportInput {
  readonly guildId: string;
  readonly type: CommunityReportType;
  readonly reporterDiscordId: string;
  readonly targetDiscordId: string;
  readonly description: string;
  readonly evidence: CommunityReportEvidence;
}

export class CommunityModerationRepository {
  public async createCase(
    input: CreateCommunityCaseInput,
  ): Promise<CommunityModerationCaseDocument> {
    const caseNumber = await this.nextSequence(input.guildId, "case");

    return CommunityModerationCaseModel.create({
      schemaVersion: 1,
      caseNumber,
      durationMs: null,
      expiresAt: null,
      pendingUntil: null,
      relatedReportId: null,
      channelId: null,
      messageId: null,
      details: {},
      completedAt: input.status === "completed" ? new Date() : null,
      failedAt: null,
      failureReason: null,
      reversedAt: null,
      reversedByDiscordId: null,
      reversalReason: null,
      purgeAt: null,
      ...input,
    });
  }

  public async findCaseById(
    guildId: string,
    caseId: string,
  ): Promise<CommunityModerationCaseDocument | null> {
    return CommunityModerationCaseModel.findOne({
      _id: caseId,
      guildId,
    }).exec();
  }

  public async findCaseByNumber(
    guildId: string,
    caseNumber: number,
  ): Promise<CommunityModerationCaseDocument | null> {
    return CommunityModerationCaseModel.findOne({ guildId, caseNumber }).exec();
  }

  public async findRecentCasesForTarget(
    guildId: string,
    targetDiscordId: string,
    limit: number,
  ): Promise<CommunityModerationCaseDocument[]> {
    return CommunityModerationCaseModel.find({ guildId, targetDiscordId })
      .sort({ createdAt: -1, caseNumber: -1 })
      .limit(limit)
      .exec();
  }

  public async countRecentAutomodCases(
    guildId: string,
    targetDiscordId: string,
    since: Date,
  ): Promise<number> {
    return CommunityModerationCaseModel.countDocuments({
      guildId,
      targetDiscordId,
      source: "automod",
      status: "completed",
      createdAt: { $gte: since },
    }).exec();
  }

  public async completeCase(
    caseId: string,
    expiresAt: Date | null,
    purgeAt: Date,
  ): Promise<CommunityModerationCaseDocument | null> {
    return CommunityModerationCaseModel.findOneAndUpdate(
      { _id: caseId, status: "pending" },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          expiresAt,
          pendingUntil: null,
          purgeAt,
        },
      },
      { returnDocument: "after", runValidators: true },
    ).exec();
  }

  public async failCase(
    caseId: string,
    failureReason: string,
    purgeAt: Date,
  ): Promise<CommunityModerationCaseDocument | null> {
    return CommunityModerationCaseModel.findOneAndUpdate(
      { _id: caseId, status: "pending" },
      {
        $set: {
          status: "failed",
          failedAt: new Date(),
          failureReason: failureReason.slice(0, 500),
          pendingUntil: null,
          purgeAt,
        },
      },
      { returnDocument: "after", runValidators: true },
    ).exec();
  }

  public async cancelCase(
    guildId: string,
    caseId: string,
    actorDiscordId: string,
    purgeAt: Date,
  ): Promise<CommunityModerationCaseDocument | null> {
    return CommunityModerationCaseModel.findOneAndUpdate(
      {
        _id: caseId,
        guildId,
        status: "pending",
        actorDiscordId,
        pendingUntil: { $gt: new Date() },
      },
      {
        $set: {
          status: "cancelled",
          pendingUntil: null,
          purgeAt,
        },
      },
      { returnDocument: "after", runValidators: true },
    ).exec();
  }

  public async reverseCase(
    caseId: string,
    actorDiscordId: string,
    reason: string,
    purgeAt: Date,
  ): Promise<CommunityModerationCaseDocument | null> {
    return CommunityModerationCaseModel.findOneAndUpdate(
      { _id: caseId, status: "completed", reversedAt: null },
      {
        $set: {
          status: "reversed",
          reversedAt: new Date(),
          reversedByDiscordId: actorDiscordId,
          reversalReason: reason,
          purgeAt,
        },
      },
      { returnDocument: "after", runValidators: true },
    ).exec();
  }

  public async expirePendingCases(
    guildId: string,
    now: Date,
    purgeAt: Date,
  ): Promise<number> {
    const result = await CommunityModerationCaseModel.updateMany(
      {
        guildId,
        status: "pending",
        pendingUntil: { $ne: null, $lte: now },
      },
      {
        $set: {
          status: "cancelled",
          pendingUntil: null,
          failureReason: "Confirmation window expired.",
          purgeAt,
        },
      },
      { runValidators: true },
    ).exec();

    return result.modifiedCount;
  }

  public async createReport(
    input: CreateCommunityReportInput,
  ): Promise<CommunityReportDocument> {
    const reportNumber = await this.nextSequence(input.guildId, "report");

    return CommunityReportModel.create({
      schemaVersion: 1,
      reportNumber,
      status: "open",
      resolutionCaseId: null,
      resolvedByDiscordId: null,
      resolvedAt: null,
      resolutionNote: null,
      purgeAt: null,
      ...input,
    });
  }

  public async findOpenDuplicateReport(
    guildId: string,
    reporterDiscordId: string,
    targetDiscordId: string,
    messageId: string | null,
  ): Promise<CommunityReportDocument | null> {
    return CommunityReportModel.findOne({
      guildId,
      reporterDiscordId,
      targetDiscordId,
      status: "open",
      "evidence.messageId": messageId,
    }).exec();
  }

  public async findOpenReports(
    guildId: string,
    limit: number,
  ): Promise<CommunityReportDocument[]> {
    return CommunityReportModel.find({ guildId, status: "open" })
      .sort({ createdAt: 1, reportNumber: 1 })
      .limit(limit)
      .exec();
  }

  public async findReportByNumber(
    guildId: string,
    reportNumber: number,
  ): Promise<CommunityReportDocument | null> {
    return CommunityReportModel.findOne({ guildId, reportNumber }).exec();
  }

  public async resolveReport(
    reportId: string,
    status: Extract<CommunityReportStatus, "resolved" | "dismissed">,
    actorDiscordId: string,
    note: string,
    resolutionCaseId: string | null,
    purgeAt: Date,
  ): Promise<CommunityReportDocument | null> {
    return CommunityReportModel.findOneAndUpdate(
      { _id: reportId, status: "open" },
      {
        $set: {
          status,
          resolvedByDiscordId: actorDiscordId,
          resolvedAt: new Date(),
          resolutionNote: note,
          resolutionCaseId,
          purgeAt,
        },
      },
      { returnDocument: "after", runValidators: true },
    ).exec();
  }

  private async nextSequence(
    guildId: string,
    kind: "case" | "report",
  ): Promise<number> {
    const counter = await CommunityModerationCounterModel.findOneAndUpdate(
      { guildId, kind },
      {
        $inc: { sequence: 1 },
        $setOnInsert: { guildId, kind },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).exec();

    if (!counter) {
      throw new Error(
        `Unable to allocate a ${kind} number in guild ${guildId}.`,
      );
    }

    return counter.sequence;
  }
}
