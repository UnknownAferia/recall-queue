import type { ClientSession, Types } from "mongoose";

import type { SquadResult } from "../constants/squad.js";
import { resolveSeasonAchievements } from "../domain/season/SeasonAchievementPolicy.js";
import { calculateSeasonInitialRsr } from "../domain/season/SeasonRatingPolicy.js";
import {
  SeasonMembershipModel,
  type SeasonMembershipDocument,
} from "../models/SeasonMembershipModel.js";
import { SeasonModel, type SeasonDocument } from "../models/SeasonModel.js";
import type { SquadRatingChange } from "../types/squad.js";
import type { CreateSeasonInput, SeasonRules } from "../types/season.js";

export interface SeasonalPlayerSnapshot {
  readonly playerId: Types.ObjectId;
  readonly discordId: string;
  readonly ign: string;
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

  public async findByIds(
    seasonIds: readonly Types.ObjectId[],
  ): Promise<SeasonDocument[]> {
    return SeasonModel.find({ _id: { $in: [...seasonIds] } }).exec();
  }

  public async findLeaderboard(
    seasonId: Types.ObjectId,
    placementMatches: number,
    limit: number,
  ): Promise<SeasonMembershipDocument[]> {
    return SeasonMembershipModel.find({
      seasonId,
      matchesPlayed: { $gte: placementMatches },
    })
      .sort({ currentRsr: -1, wins: -1, joinedAt: 1 })
      .limit(limit)
      .exec();
  }

  public async findPlayerMemberships(
    discordId: string,
    limit: number,
  ): Promise<SeasonMembershipDocument[]> {
    return SeasonMembershipModel.find({ discordId })
      .sort({ lastMatchAt: -1 })
      .limit(limit)
      .exec();
  }

  public async findRewardRecipients(
    seasonId: Types.ObjectId,
  ): Promise<SeasonMembershipDocument[]> {
    return SeasonMembershipModel.find({
      seasonId,
      "achievements.0": { $exists: true },
    }).exec();
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
    placementMatches: number,
    session: ClientSession,
  ): Promise<number> {
    const memberships = await SeasonMembershipModel.find({ seasonId })
      .sort({ currentRsr: -1, wins: -1, joinedAt: 1 })
      .session(session)
      .exec();

    if (memberships.length === 0) {
      return 0;
    }

    let eligibleRank = 0;
    const result = await SeasonMembershipModel.bulkWrite(
      memberships.map((membership) => {
        const placementComplete = membership.matchesPlayed >= placementMatches;
        const finalRank = placementComplete ? ++eligibleRank : null;
        const achievements = resolveSeasonAchievements({
          finalRank,
          matchesPlayed: membership.matchesPlayed,
        });

        return {
          updateOne: {
            filter: { _id: membership._id, finalRsr: null },
            update: {
              $set: {
                finalRsr: membership.currentRsr,
                finalRank,
                achievements,
              },
            },
          },
        };
      }),
      { ordered: true, session },
    );

    return result.modifiedCount;
  }

  public async recordVerifiedResult(
    seasonId: Types.ObjectId,
    players: readonly SeasonalPlayerSnapshot[],
    ratingChanges: readonly SquadRatingChange[],
    outcome: SquadResult,
    rules: SeasonRules,
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

        const initialSeasonRsr = calculateSeasonInitialRsr(
          change.rsrBefore,
          rules,
        );
        const currentSeasonRsr = {
          $max: [
            0,
            {
              $add: [
                { $ifNull: ["$currentRsr", initialSeasonRsr] },
                change.delta,
              ],
            },
          ],
        };

        return {
          updateOne: {
            filter: { seasonId, playerId: player.playerId },
            update: [
              {
                $set: {
                  seasonId,
                  playerId: player.playerId,
                  discordId: player.discordId,
                  ign: player.ign,
                  initialRsr: {
                    $ifNull: ["$initialRsr", initialSeasonRsr],
                  },
                  currentRsr: currentSeasonRsr,
                  peakRsr: {
                    $max: [
                      { $ifNull: ["$peakRsr", initialSeasonRsr] },
                      currentSeasonRsr,
                    ],
                  },
                  finalRsr: null,
                  finalRank: null,
                  achievements: [],
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
