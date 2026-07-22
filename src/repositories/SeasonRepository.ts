import type { ClientSession, Types } from "mongoose";

import type { SquadResult } from "../constants/squad.js";
import { SeasonMembershipModel } from "../models/SeasonMembershipModel.js";
import { SeasonModel, type SeasonDocument } from "../models/SeasonModel.js";
import type { SquadRatingChange } from "../types/squad.js";
import type { CreateSeasonInput, SeasonRules } from "../types/season.js";

export interface SeasonalPlayerSnapshot {
  readonly playerId: Types.ObjectId;
  readonly discordId: string;
}

export class SeasonRepository {
  public async createScheduled(
    input: CreateSeasonInput & { rules: SeasonRules },
  ): Promise<SeasonDocument> {
    return SeasonModel.create({
      ...input,
      status: "scheduled",
      activatedAt: null,
      completedAt: null,
      activatedByDiscordId: null,
      completedByDiscordId: null,
    });
  }

  public async findById(
    seasonId: string,
    session?: ClientSession,
  ): Promise<SeasonDocument | null> {
    const query = SeasonModel.findById(seasonId);

    if (session) {
      query.session(session);
    }

    return query.exec();
  }

  public async findActive(
    session?: ClientSession,
  ): Promise<SeasonDocument | null> {
    const query = SeasonModel.findOne({ status: "active" });

    if (session) {
      query.session(session);
    }

    return query.exec();
  }

  public async findScheduled(limit: number): Promise<SeasonDocument[]> {
    return SeasonModel.find({ status: "scheduled" })
      .sort({ startsAt: 1, sequence: 1 })
      .limit(limit)
      .exec();
  }

  public async findRecentlyCompleted(limit: number): Promise<SeasonDocument[]> {
    return SeasonModel.find({ status: "completed" })
      .sort({ completedAt: -1, sequence: -1 })
      .limit(limit)
      .exec();
  }

  public async activateScheduled(
    seasonId: string,
    actorDiscordId: string,
    activatedAt: Date,
  ): Promise<SeasonDocument | null> {
    return SeasonModel.findOneAndUpdate(
      { _id: seasonId, status: "scheduled" },
      {
        $set: {
          status: "active",
          activatedAt,
          activatedByDiscordId: actorDiscordId,
        },
      },
      { returnDocument: "after", runValidators: true },
    ).exec();
  }

  public async completeActive(
    seasonId: string,
    actorDiscordId: string,
    completedAt: Date,
    session: ClientSession,
  ): Promise<SeasonDocument | null> {
    return SeasonModel.findOneAndUpdate(
      { _id: seasonId, status: "active" },
      {
        $set: {
          status: "completed",
          completedAt,
          completedByDiscordId: actorDiscordId,
        },
      },
      { returnDocument: "after", runValidators: true, session },
    ).exec();
  }

  public async finalizeMemberships(
    seasonId: Types.ObjectId,
    session: ClientSession,
  ): Promise<number> {
    const result = await SeasonMembershipModel.updateMany(
      { seasonId, finalRsr: null },
      [{ $set: { finalRsr: "$currentRsr" } }],
      { updatePipeline: true, session },
    ).exec();

    return result.modifiedCount;
  }

  public async recordVerifiedResult(
    seasonId: Types.ObjectId,
    players: readonly SeasonalPlayerSnapshot[],
    ratingChanges: readonly SquadRatingChange[],
    outcome: SquadResult,
    recordedAt: Date,
    session: ClientSession,
  ): Promise<number> {
    const changesByDiscordId = new Map(
      ratingChanges.map((change) => [change.discordId, change]),
    );

    const result = await SeasonMembershipModel.bulkWrite(
      players.map((player) => {
        const change = changesByDiscordId.get(player.discordId);

        if (!change) {
          throw new Error(
            `Season progression is missing rating data for ${player.discordId}.`,
          );
        }

        return {
          updateOne: {
            filter: { seasonId, playerId: player.playerId },
            update: [
              {
                $set: {
                  seasonId,
                  playerId: player.playerId,
                  discordId: player.discordId,
                  initialRsr: { $ifNull: ["$initialRsr", change.rsrBefore] },
                  currentRsr: change.rsrAfter,
                  peakRsr: {
                    $max: [
                      { $ifNull: ["$peakRsr", change.rsrBefore] },
                      change.rsrBefore,
                      change.rsrAfter,
                    ],
                  },
                  finalRsr: null,
                  matchesPlayed: {
                    $add: [{ $ifNull: ["$matchesPlayed", 0] }, 1],
                  },
                  wins: {
                    $add: [
                      { $ifNull: ["$wins", 0] },
                      outcome === "win" ? 1 : 0,
                    ],
                  },
                  losses: {
                    $add: [
                      { $ifNull: ["$losses", 0] },
                      outcome === "loss" ? 1 : 0,
                    ],
                  },
                  joinedAt: { $ifNull: ["$joinedAt", recordedAt] },
                  lastMatchAt: recordedAt,
                },
              },
            ],
            upsert: true,
          },
        };
      }),
      { ordered: true, session },
    );

    return result.matchedCount + result.upsertedCount;
  }
}
