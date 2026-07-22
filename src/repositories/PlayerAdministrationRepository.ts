import type { ClientSession } from "mongoose";

import { CommunityModerationCaseModel } from "../models/CommunityModerationCaseModel.js";
import { CommunityReportModel } from "../models/CommunityReportModel.js";
import { ModerationAuditModel } from "../models/ModerationAuditModel.js";
import {
  PlayerAdministrationOperationModel,
  type PlayerAdministrationOperationDocument,
} from "../models/PlayerAdministrationOperationModel.js";
import { PlayerModel, type PlayerDocument } from "../models/PlayerModel.js";
import { PlayerVerificationModel } from "../models/PlayerVerificationModel.js";
import { QueueModel } from "../models/QueueModel.js";
import { SeasonMembershipModel } from "../models/SeasonMembershipModel.js";
import { SquadModel } from "../models/SquadModel.js";
import type {
  PlayerAdministrationAction,
  PlayerAdministrationOperationStatus,
} from "../constants/playerAdministration.js";
import type {
  PlayerAdministrationHistorySummary,
  PlayerAdministrationOperation,
} from "../types/playerAdministration.js";
import type { PlayerVerificationEvidence } from "../types/playerVerification.js";

function useSession<T extends { session(session: ClientSession): T }>(
  query: T,
  session?: ClientSession,
): T {
  return session ? query.session(session) : query;
}

export class PlayerAdministrationRepository {
  public async findPlayer(
    discordId: string,
    session?: ClientSession,
  ): Promise<PlayerDocument | null> {
    return useSession(
      PlayerModel.findOne({ "discord.id": discordId }),
      session,
    ).exec();
  }

  public async getHistorySummary(
    discordId: string,
    session?: ClientSession,
  ): Promise<PlayerAdministrationHistorySummary> {
    const activeSquadQuery = useSession(
      SquadModel.findOne({
        "participants.discordId": discordId,
        status: { $in: ["ready_check", "active", "result_pending"] },
      }).select({ _id: 1, guildId: 1 }),
      session,
    );
    const queuesQuery = useSession(
      QueueModel.find({ "entries.discordId": discordId }).select({ guildId: 1 }),
      session,
    );
    const competitiveSquadsQuery = useSession(
      SquadModel.countDocuments({
        "participants.discordId": discordId,
        $or: [
          { status: { $in: ["completed", "disputed"] } },
          { "result.statisticsProcessedAt": { $ne: null } },
          { "result.moderation": { $ne: null } },
        ],
      }),
      session,
    );
    const seasonsQuery = useSession(
      SeasonMembershipModel.countDocuments({ discordId }),
      session,
    );
    const coreModerationQuery = useSession(
      ModerationAuditModel.countDocuments({ targetDiscordId: discordId }),
      session,
    );
    const communityCasesQuery = useSession(
      CommunityModerationCaseModel.countDocuments({ targetDiscordId: discordId }),
      session,
    );
    const reportsQuery = useSession(
      CommunityReportModel.countDocuments({ targetDiscordId: discordId }),
      session,
    );
    const verificationsQuery = useSession(
      PlayerVerificationModel.countDocuments({
        playerDiscordId: discordId,
        status: "pending",
      }),
      session,
    );

    const [
      activeSquad,
      queues,
      competitiveSquads,
      seasonMemberships,
      coreModeration,
      communityCases,
      reports,
      pendingVerifications,
    ] = await Promise.all([
      activeSquadQuery.exec(),
      queuesQuery.exec(),
      competitiveSquadsQuery.exec(),
      seasonsQuery.exec(),
      coreModerationQuery.exec(),
      communityCasesQuery.exec(),
      reportsQuery.exec(),
      verificationsQuery.exec(),
    ]);

    return {
      queueGuildIds: queues.map((queue) => queue.guildId),
      activeSquadId: activeSquad?.id ?? null,
      activeSquadGuildId: activeSquad?.guildId ?? null,
      competitiveSquads,
      seasonMemberships,
      moderationRecords: coreModeration + communityCases + reports,
      pendingVerifications,
    };
  }

  public async createOperation(input: {
    action: PlayerAdministrationAction;
    guildId: string;
    actorDiscordId: string;
    targetDiscordId: string;
    reason: string;
    expiresAt: Date;
  }): Promise<PlayerAdministrationOperationDocument> {
    return PlayerAdministrationOperationModel.create({
      schemaVersion: 1,
      ...input,
      status: "pending",
      completedAt: null,
      blockerReasons: [],
      snapshot: null,
      result: null,
    });
  }

  public async findOwnedOperation(
    operationId: string,
    guildId: string,
    actorDiscordId: string,
    session?: ClientSession,
  ): Promise<PlayerAdministrationOperationDocument | null> {
    return useSession(
      PlayerAdministrationOperationModel.findOne({
        _id: operationId,
        guildId,
        actorDiscordId,
      }),
      session,
    ).exec();
  }

  public async transitionOperation(
    operationId: string,
    expectedStatus: PlayerAdministrationOperationStatus,
    update: Record<string, unknown>,
    session?: ClientSession,
  ): Promise<PlayerAdministrationOperationDocument | null> {
    return PlayerAdministrationOperationModel.findOneAndUpdate(
      { _id: operationId, status: expectedStatus },
      { $set: update },
      { returnDocument: "after", runValidators: true, session },
    ).exec();
  }

  public async removeFromAllQueues(
    discordId: string,
    session: ClientSession,
  ): Promise<number> {
    const result = await QueueModel.updateMany(
      { "entries.discordId": discordId },
      { $pull: { entries: { discordId } } },
      { session },
    ).exec();

    return result.modifiedCount;
  }

  public async closePendingVerifications(
    discordId: string,
    actorDiscordId: string,
    reason: string,
    session: ClientSession,
  ): Promise<readonly PlayerVerificationEvidence[]> {
    const pending = await PlayerVerificationModel.find({
      playerDiscordId: discordId,
      status: "pending",
    })
      .session(session)
      .exec();

    if (pending.length === 0) {
      return [];
    }

    await PlayerVerificationModel.updateMany(
      { _id: { $in: pending.map((request) => request._id) }, status: "pending" },
      {
        $set: {
          status: "rejected",
          reviewedAt: new Date(),
          reviewedByDiscordId: actorDiscordId,
          rejectionReason: `Administrative lifecycle action: ${reason}`.slice(0, 500),
        },
      },
      { session, runValidators: true },
    ).exec();

    return pending.map((request) => ({
      archiveChannelId: request.evidence.archiveChannelId,
      archiveMessageId: request.evidence.archiveMessageId,
      archiveAttachmentId: request.evidence.archiveAttachmentId,
      fileName: request.evidence.fileName,
      contentType: request.evidence.contentType,
      size: request.evidence.size,
    }));
  }

  public async resetVerification(
    discordId: string,
    session: ClientSession,
  ): Promise<boolean> {
    const result = await PlayerModel.updateOne(
      { "discord.id": discordId },
      {
        $set: {
          verification: {
            status: "pending",
            submittedAt: null,
            reviewedAt: null,
            reviewedByDiscordId: null,
            rejectionReason: null,
          },
        },
      },
      { session, runValidators: true },
    ).exec();

    return result.matchedCount === 1;
  }

  public async deleteUnusedPlayer(
    playerId: string,
    discordId: string,
    session: ClientSession,
  ): Promise<boolean> {
    const result = await PlayerModel.deleteOne(
      {
        _id: playerId,
        "discord.id": discordId,
        "statistics.matchesPlayed": 0,
      },
      { session },
    ).exec();

    return result.deletedCount === 1;
  }

  public async recordExternalCleanup(
    operationId: string,
    rolesRemoved: number,
    evidenceMessagesRemoved: number,
  ): Promise<void> {
    await PlayerAdministrationOperationModel.updateOne(
      { _id: operationId, status: "completed" },
      {
        $set: {
          "result.managedRolesRemoved": rolesRemoved,
          "result.evidenceMessagesRemoved": evidenceMessagesRemoved,
        },
      },
      { runValidators: true },
    ).exec();
  }

  public toOperation(
    document: PlayerAdministrationOperationDocument,
  ): PlayerAdministrationOperation {
    return {
      id: document.id,
      schemaVersion: document.schemaVersion,
      action: document.action,
      status: document.status,
      guildId: document.guildId,
      actorDiscordId: document.actorDiscordId,
      targetDiscordId: document.targetDiscordId,
      reason: document.reason,
      expiresAt: new Date(document.expiresAt),
      completedAt: document.completedAt ? new Date(document.completedAt) : null,
      blockerReasons: [...document.blockerReasons],
      snapshot: document.snapshot
        ? {
            playerId: document.snapshot.playerId,
            ign: document.snapshot.ign,
            gamePlayerId: document.snapshot.gamePlayerId,
            gameServerId: document.snapshot.gameServerId,
            verificationStatus: document.snapshot.verificationStatus,
            matchesPlayed: document.snapshot.matchesPlayed,
            rsr: document.snapshot.rsr,
          }
        : null,
      result: document.result
        ? {
            queuesRemoved: document.result.queuesRemoved,
            verificationRequestsClosed:
              document.result.verificationRequestsClosed,
            playerDeleted: document.result.playerDeleted,
            managedRolesRemoved: document.result.managedRolesRemoved,
            evidenceMessagesRemoved: document.result.evidenceMessagesRemoved,
          }
        : null,
      createdAt: new Date(document.createdAt),
      updatedAt: new Date(document.updatedAt),
    };
  }
}
