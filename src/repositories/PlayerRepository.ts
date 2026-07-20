import { normalizePlayerRole } from "../constants/playerRoles.js";
import type { SquadResult } from "../constants/squad.js";
import type { ClientSession } from "mongoose";
import { PlayerModel, type PlayerDocument } from "../models/PlayerModel.js";

import type {
  CreatePlayerInput,
  PlayerRolePreferences,
} from "../types/player.js";
import type { SquadRatingChange } from "../types/squad.js";
import type { QueueDisciplinePenalty } from "../domain/discipline/QueueDisciplinePolicy.js";
import type { IntegritySanctionPenalty } from "../domain/integrity/IntegritySanctionPolicy.js";

export class PlayerRepository {
  public async recordReadyCheckAcceptance(discordId: string): Promise<boolean> {
    const result = await PlayerModel.updateOne(
      { "discord.id": discordId },
      { $inc: { "queue.acceptedMatches": 1 } },
      { runValidators: true },
    ).exec();

    return result.modifiedCount === 1;
  }

  public async applyReadyCheckPenalty(
    discordId: string,
    penalty: QueueDisciplinePenalty,
  ): Promise<boolean> {
    const result = await PlayerModel.updateOne(
      { "discord.id": discordId },
      [
        {
          $set: {
            "queue.declinedMatches": {
              $add: [{ $ifNull: ["$queue.declinedMatches", 0] }, 1],
            },
            "queue.bannedUntil": {
              $max: [
                { $ifNull: ["$queue.bannedUntil", new Date(0)] },
                penalty.bannedUntil,
              ],
            },
            "queue.disciplineLevel": penalty.level,
            "queue.lastPenaltyAt": penalty.appliedAt,
            "behavior.penalties": {
              $add: [{ $ifNull: ["$behavior.penalties", 0] }, 1],
            },
            "behavior.score": {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$behavior.score", 100] },
                    penalty.behaviorScoreLoss,
                  ],
                },
              ],
            },
          },
        },
      ],
      { updatePipeline: true },
    ).exec();

    return result.modifiedCount === 1;
  }

  public async applyIntegritySanction(
    discordId: string,
    penalty: IntegritySanctionPenalty,
    session: ClientSession,
  ): Promise<boolean> {
    const result = await PlayerModel.updateOne(
      { "discord.id": discordId },
      [
        {
          $set: {
            "behavior.score": {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$behavior.score", 100] },
                    penalty.behaviorScoreLoss,
                  ],
                },
              ],
            },
            "behavior.penalties": {
              $add: [{ $ifNull: ["$behavior.penalties", 0] }, 1],
            },
            "behavior.integrityLevel": penalty.levelAfter,
            "behavior.lastIntegritySanctionAt": penalty.appliedAt,
            "queue.bannedUntil": {
              $max: [
                { $ifNull: ["$queue.bannedUntil", new Date(0)] },
                penalty.bannedUntil,
              ],
            },
          },
        },
      ],
      { updatePipeline: true, session },
    ).exec();

    return result.matchedCount === 1;
  }

  public async applyVerifiedSquadResult(
    ratingChanges: readonly SquadRatingChange[],
    outcome: SquadResult,
    session: ClientSession,
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    const result = await PlayerModel.bulkWrite(
      ratingChanges.map((change) => ({
        updateOne: {
          filter: {
            "discord.id": change.discordId,
            "rating.rsr": change.rsrBefore,
            "rating.confidence": change.confidenceBefore,
          },
          update: {
            $set: {
              "rating.rsr": change.rsrAfter,
              "rating.confidence": change.confidenceAfter,
            },
            $inc: {
              "statistics.matchesPlayed": 1,
              [`statistics.${outcome === "win" ? "wins" : "losses"}`]: 1,
            },
          },
        },
      })),
      {
        ordered: true,
        session,
      },
    );

    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  public async recoverBehaviorAfterVerifiedResult(
    discordIds: readonly string[],
    session: ClientSession,
  ): Promise<number> {
    const result = await PlayerModel.updateMany(
      {
        "discord.id": {
          $in: [...discordIds],
        },
        "behavior.score": { $lt: 100 },
      },
      {
        $inc: {
          "behavior.score": 1,
        },
      },
      {
        runValidators: true,
        session,
      },
    ).exec();

    return result.modifiedCount;
  }

  public async findByDiscordId(
    discordId: string,
    session?: ClientSession,
  ): Promise<PlayerDocument | null> {
    const query = PlayerModel.findOne({
      "discord.id": discordId,
    });

    if (session) {
      query.session(session);
    }

    return query.exec();
  }

  public async findByDiscordIds(
    discordIds: readonly string[],
    session?: ClientSession,
  ): Promise<PlayerDocument[]> {
    const query = PlayerModel.find({
      "discord.id": {
        $in: [...discordIds],
      },
    });

    if (session) {
      query.session(session);
    }

    return query.exec();
  }

  public async findByGameAccount(
    playerId: string,
    serverId: string,
  ): Promise<PlayerDocument | null> {
    return PlayerModel.findOne({
      "game.playerId": playerId,
      "game.serverId": serverId,
    }).exec();
  }

  public async existsByDiscordId(discordId: string): Promise<boolean> {
    return PlayerModel.exists({
      "discord.id": discordId,
    }).then((result) => result !== null);
  }

  public async existsByGameAccount(
    playerId: string,
    serverId: string,
  ): Promise<boolean> {
    return PlayerModel.exists({
      "game.playerId": playerId,
      "game.serverId": serverId,
    }).then((result) => result !== null);
  }

  public async create(input: CreatePlayerInput): Promise<PlayerDocument> {
    return PlayerModel.create({
      discord: {
        id: input.discordId,
        username: input.discordUsername,
      },

      game: {
        ign: input.ign,
        playerId: input.playerId,
        serverId: input.serverId,
      },

      rating: {},
      statistics: {},
      behavior: {},
      queue: {},

      preferences: {
        roles: {
          primary: null,
          secondary: null,
          avoided: null,
        },
      },
    });
  }

  public async updateRolePreferences(
    discordId: string,
    preferences: PlayerRolePreferences,
  ): Promise<PlayerDocument | null> {
    const normalizedPreferences: PlayerRolePreferences = {
      primary: normalizePlayerRole(preferences.primary),

      secondary: normalizePlayerRole(preferences.secondary),

      avoided: normalizePlayerRole(preferences.avoided),
    };

    return PlayerModel.findOneAndUpdate(
      {
        "discord.id": discordId,
      },
      {
        $set: {
          "preferences.roles": normalizedPreferences,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).exec();
  }
  public async findHighestRated(limit: number): Promise<PlayerDocument[]> {
    return PlayerModel.find()
      .sort({
        "rating.rsr": -1,
        "statistics.wins": -1,
        createdAt: 1,
      })
      .limit(limit)
      .exec();
  }
}
