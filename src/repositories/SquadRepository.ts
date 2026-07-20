import { createHash } from "node:crypto";

import mongoose, { type ClientSession } from "mongoose";

import type { ReadyCheckStatus, SquadResult } from "../constants/squad.js";
import type {
  SquadIntegritySanction,
  SquadRatingChange,
  SquadResultEvidence,
} from "../types/squad.js";
import { SquadConfig } from "../constants/squad.js";
import type { SquadFormation } from "../domain/matchmaking/TeamFormationEngine.js";
import type { QueueDocument } from "../models/QueueModel.js";
import { QueueModel } from "../models/QueueModel.js";
import { SquadModel, type SquadDocument } from "../models/SquadModel.js";

export class SquadRepository {
  public async existsActiveByDiscordId(
    guildId: string,
    discordId: string,
  ): Promise<boolean> {
    return SquadModel.exists({
      guildId,
      status: {
        $in: ["ready_check", "active", "result_pending"],
      },
      "participants.discordId": discordId,
    }).then((result) => result !== null);
  }

  public async findById(squadId: string): Promise<SquadDocument | null> {
    return SquadModel.findById(squadId).exec();
  }

  public async findOpenByGuild(guildId: string): Promise<SquadDocument[]> {
    return SquadModel.find({
      guildId,
      status: {
        $in: ["active", "result_pending"],
      },
    }).exec();
  }

  public async findWithVoiceChannelByGuild(
    guildId: string,
  ): Promise<SquadDocument[]> {
    return SquadModel.find({
      guildId,
      voiceChannelId: {
        $ne: null,
      },
    }).exec();
  }

  public async setVoiceChannelId(
    squadId: string,
    guildId: string,
    voiceChannelId: string,
  ): Promise<boolean> {
    const result = await SquadModel.updateOne(
      {
        _id: squadId,
        guildId,
        status: {
          $in: ["active", "result_pending"],
        },
        $or: [{ voiceChannelId: null }, { voiceChannelId: { $exists: false } }],
      },
      {
        $set: {
          voiceChannelId,
        },
      },
      {
        runValidators: true,
      },
    ).exec();

    return result.matchedCount === 1;
  }

  public async clearVoiceChannelId(
    squadId: string,
    guildId: string,
    voiceChannelId: string,
  ): Promise<void> {
    await SquadModel.updateOne(
      {
        _id: squadId,
        guildId,
        voiceChannelId,
      },
      {
        $set: {
          voiceChannelId: null,
        },
      },
      {
        runValidators: true,
      },
    ).exec();
  }

  public async findActiveByDiscordId(
    guildId: string,
    discordId: string,
  ): Promise<SquadDocument | null> {
    return SquadModel.findOne({
      guildId,
      status: {
        $in: ["ready_check", "active", "result_pending"],
      },
      "participants.discordId": discordId,
    })
      .sort({ createdAt: -1 })
      .exec();
  }

  public async findRecentVerifiedByDiscordId(
    guildId: string,
    discordId: string,
    limit: number,
  ): Promise<SquadDocument[]> {
    return SquadModel.find({
      guildId,
      status: "completed",
      "participants.discordId": discordId,
      "result.verifiedAt": {
        $ne: null,
      },
      "result.statisticsProcessedAt": {
        $ne: null,
      },
    })
      .sort({ closedAt: -1, _id: -1 })
      .limit(limit)
      .exec();
  }

  public async findDisputedByGuild(
    guildId: string,
    limit: number,
  ): Promise<SquadDocument[]> {
    return SquadModel.find({ guildId, status: "disputed" })
      .sort({ closedAt: 1, createdAt: 1 })
      .limit(limit)
      .exec();
  }

  public async findDisputedById(
    guildId: string,
    squadId: string,
  ): Promise<SquadDocument | null> {
    return SquadModel.findOne({
      _id: squadId,
      guildId,
      status: "disputed",
    }).exec();
  }

  public async createFromQueue(
    queue: QueueDocument,
    formation: SquadFormation,
  ): Promise<SquadDocument | null> {
    const selectedDiscordIds = formation.team.assignments.map(
      (assignment) => assignment.candidate.id,
    );

    const selectedEntries = queue.entries.filter((entry) =>
      selectedDiscordIds.includes(entry.discordId),
    );

    if (selectedEntries.length !== selectedDiscordIds.length) {
      return null;
    }

    const sourceQueueKey = this.createSourceQueueKey(
      queue.guildId,
      selectedEntries,
    );

    return mongoose.connection.transaction(async (session) => {
      const consumedQueue = await QueueModel.findOneAndUpdate(
        {
          _id: queue._id,
          status: "open",
          "entries.discordId": {
            $all: selectedDiscordIds,
          },
        },
        {
          $pull: {
            entries: {
              discordId: {
                $in: selectedDiscordIds,
              },
            },
          },
        },
        {
          returnDocument: "after",
          runValidators: true,
          session,
        },
      ).exec();

      if (!consumedQueue) {
        return null;
      }

      const [createdSquad] = await SquadModel.create(
        [
          {
            guildId: queue.guildId,
            sourceQueueKey,
            status: "ready_check",
            captainDiscordId: formation.captainDiscordId,
            participants: formation.team.assignments.map((assignment) => ({
              discordId: assignment.candidate.id,
              displayName: assignment.candidate.displayName,
              assignedRole: assignment.assignedRole,
              roleFit: assignment.roleFit,
              rsrBefore: assignment.candidate.rsr,
              behaviorScore: assignment.candidate.behaviorScore,
              readyStatus: "pending",
            })),
            metrics: {
              averageRsr: formation.team.averageRsr,
              rsrSpread: formation.rsrSpread,
              averageBehaviorScore: formation.team.averageBehaviorScore,
              behaviorSpread: formation.behaviorSpread,
              rolePenalty: formation.team.rolePenalty,
              totalCost: formation.totalCost,
              compatibilityScore: formation.compatibilityScore,
            },
            result: null,
            readyCheckExpiresAt: new Date(
              Date.now() + SquadConfig.readyCheckDurationMs,
            ),
          },
        ],
        {
          session,
        },
      );

      if (!createdSquad) {
        throw new Error("MongoDB did not return the created squad.");
      }

      return createdSquad;
    });
  }

  public async setParticipantReadyStatus(
    squadId: string,
    guildId: string,
    discordId: string,
    readyStatus: Exclude<ReadyCheckStatus, "pending">,
  ): Promise<SquadDocument | null> {
    return SquadModel.findOneAndUpdate(
      {
        _id: squadId,
        guildId,
        status: "ready_check",
        readyCheckExpiresAt: {
          $gt: new Date(),
        },
        participants: {
          $elemMatch: {
            discordId,
            readyStatus: "pending",
          },
        },
      },
      {
        $set: {
          "participants.$[participant].readyStatus": readyStatus,
        },
      },
      {
        arrayFilters: [
          {
            "participant.discordId": discordId,
            "participant.readyStatus": "pending",
          },
        ],
        returnDocument: "after",
        runValidators: true,
      },
    ).exec();
  }

  public async activateReadySquad(
    squadId: string,
  ): Promise<SquadDocument | null> {
    return SquadModel.findOneAndUpdate(
      {
        _id: squadId,
        status: "ready_check",
        $expr: {
          $allElementsTrue: [
            {
              $map: {
                input: "$participants",
                as: "participant",
                in: {
                  $eq: ["$$participant.readyStatus", "accepted"],
                },
              },
            },
          ],
        },
      },
      {
        $set: {
          status: "active",
          activatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).exec();
  }

  public async cancelReadySquad(
    squadId: string,
    closedByDiscordId: string | null = null,
  ): Promise<SquadDocument | null> {
    return SquadModel.findOneAndUpdate(
      {
        _id: squadId,
        status: "ready_check",
      },
      {
        $set: {
          status: "cancelled",
          closedAt: new Date(),
          closedByDiscordId,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).exec();
  }

  public async cancelExpiredReadyChecks(): Promise<SquadDocument[]> {
    const expiredSquads = await SquadModel.find(
      {
        status: "ready_check",
        readyCheckExpiresAt: {
          $lte: new Date(),
        },
      },
      { _id: 1 },
    )
      .sort({ readyCheckExpiresAt: 1 })
      .limit(SquadConfig.expirationBatchSize)
      .exec();
    const cancelledSquads = await Promise.all(
      expiredSquads.map((squad) =>
        SquadModel.findOneAndUpdate(
          {
            _id: squad.id,
            status: "ready_check",
            readyCheckExpiresAt: { $lte: new Date() },
          },
          {
            $set: {
              status: "cancelled",
              closedAt: new Date(),
            },
          },
          {
            returnDocument: "after",
            runValidators: true,
          },
        ).exec(),
      ),
    );

    return cancelledSquads.filter(
      (squad): squad is SquadDocument => squad !== null,
    );
  }

  public async closeActiveSquad(
    squadId: string,
    guildId: string,
    status: "completed" | "cancelled",
    closedByDiscordId: string,
  ): Promise<SquadDocument | null> {
    return SquadModel.findOneAndUpdate(
      {
        _id: squadId,
        guildId,
        status: "active",
        "participants.discordId": closedByDiscordId,
      },
      {
        $set: {
          status,
          closedAt: new Date(),
          closedByDiscordId,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).exec();
  }

  public async submitResultReport(
    squadId: string,
    guildId: string,
    captainDiscordId: string,
    outcome: SquadResult,
    evidence: SquadResultEvidence,
  ): Promise<SquadDocument | null> {
    const reportedAt = new Date();

    return SquadModel.findOneAndUpdate(
      {
        _id: squadId,
        guildId,
        status: "active",
        captainDiscordId,
        "participants.discordId": captainDiscordId,
      },
      {
        $set: {
          status: "result_pending",
          result: {
            outcome,
            reportedByDiscordId: captainDiscordId,
            reportedAt,
            confirmedByDiscordIds: [captainDiscordId],
            disputedByDiscordIds: [],
            verifiedAt: null,
            statisticsProcessedAt: null,
            ratingChanges: [],
            moderation: null,
            evidence,
          },
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).exec();
  }

  public async recordResultResponse(
    squadId: string,
    guildId: string,
    discordId: string,
    response: "confirmed" | "disputed",
  ): Promise<SquadDocument | null> {
    const responsePath =
      response === "confirmed"
        ? "result.confirmedByDiscordIds"
        : "result.disputedByDiscordIds";

    return SquadModel.findOneAndUpdate(
      {
        _id: squadId,
        guildId,
        status: "result_pending",
        "participants.discordId": discordId,
        "result.confirmedByDiscordIds": {
          $ne: discordId,
        },
        "result.disputedByDiscordIds": {
          $ne: discordId,
        },
      },
      {
        $addToSet: {
          [responsePath]: discordId,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).exec();
  }

  public async completeVerifiedResult(
    squadId: string,
    confirmationsRequired: number,
    session: ClientSession,
  ): Promise<SquadDocument | null> {
    const verifiedAt = new Date();

    return SquadModel.findOneAndUpdate(
      {
        _id: squadId,
        status: "result_pending",
        [`result.confirmedByDiscordIds.${confirmationsRequired - 1}`]: {
          $exists: true,
        },
        "result.disputedByDiscordIds": {
          $size: 0,
        },
      },
      {
        $set: {
          status: "completed",
          "result.verifiedAt": verifiedAt,
          "result.statisticsProcessedAt": verifiedAt,
          closedAt: verifiedAt,
          closedByDiscordId: null,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
        session,
      },
    ).exec();
  }

  public async completeModeratedResult(
    squadId: string,
    guildId: string,
    moderatorDiscordId: string,
    originalOutcome: SquadResult,
    finalOutcome: SquadResult,
    reportedByDiscordId: string,
    sanction: SquadIntegritySanction,
    session: ClientSession,
  ): Promise<SquadDocument | null> {
    const moderatedAt = new Date();

    return SquadModel.findOneAndUpdate(
      {
        _id: squadId,
        guildId,
        status: "disputed",
        "result.outcome": originalOutcome,
        "result.reportedByDiscordId": reportedByDiscordId,
        "result.ratingChanges.0": { $exists: false },
        $or: [
          { "result.moderation": null },
          { "result.moderation": { $exists: false } },
        ],
      },
      {
        $set: {
          status: "completed",
          "result.outcome": finalOutcome,
          "result.verifiedAt": moderatedAt,
          "result.statisticsProcessedAt": moderatedAt,
          "result.moderation": {
            decision:
              originalOutcome === finalOutcome ? "upheld" : "overridden",
            originalOutcome,
            finalOutcome,
            moderatedByDiscordId: moderatorDiscordId,
            moderatedAt,
            sanction,
          },
          closedAt: moderatedAt,
          closedByDiscordId: moderatorDiscordId,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
        session,
      },
    ).exec();
  }

  public async voidDisputedResult(
    squadId: string,
    guildId: string,
    moderatorDiscordId: string,
    originalOutcome: SquadResult,
    reportedByDiscordId: string,
    sanction: SquadIntegritySanction,
    session: ClientSession,
  ): Promise<SquadDocument | null> {
    const moderatedAt = new Date();

    return SquadModel.findOneAndUpdate(
      {
        _id: squadId,
        guildId,
        status: "disputed",
        "result.outcome": originalOutcome,
        "result.reportedByDiscordId": reportedByDiscordId,
        "result.ratingChanges.0": { $exists: false },
        $or: [
          { "result.moderation": null },
          { "result.moderation": { $exists: false } },
        ],
      },
      {
        $set: {
          status: "cancelled",
          "result.moderation": {
            decision: "voided",
            originalOutcome,
            finalOutcome: null,
            moderatedByDiscordId: moderatorDiscordId,
            moderatedAt,
            sanction,
          },
          closedAt: moderatedAt,
          closedByDiscordId: moderatorDiscordId,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
        session,
      },
    ).exec();
  }

  public async storeRatingChanges(
    squadId: string,
    ratingChanges: readonly SquadRatingChange[],
    session: ClientSession,
  ): Promise<SquadDocument | null> {
    return SquadModel.findOneAndUpdate(
      {
        _id: squadId,
        status: "completed",
        "result.statisticsProcessedAt": { $ne: null },
        "result.ratingChanges.0": { $exists: false },
      },
      {
        $set: {
          "result.ratingChanges": [...ratingChanges],
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
        session,
      },
    ).exec();
  }

  public async markResultDisputed(
    squadId: string,
    disputedByDiscordId: string,
  ): Promise<SquadDocument | null> {
    return SquadModel.findOneAndUpdate(
      {
        _id: squadId,
        status: "result_pending",
        "result.disputedByDiscordIds": disputedByDiscordId,
      },
      {
        $set: {
          status: "disputed",
          closedAt: new Date(),
          closedByDiscordId: disputedByDiscordId,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).exec();
  }

  private createSourceQueueKey(
    guildId: string,
    entries: readonly {
      readonly discordId: string;
      readonly joinedAt: Date;
    }[],
  ): string {
    const source = entries
      .map(
        (entry) =>
          `${entry.discordId}:${new Date(entry.joinedAt).toISOString()}`,
      )
      .sort()
      .join("|");

    return createHash("sha256").update(`${guildId}|${source}`).digest("hex");
  }
}
