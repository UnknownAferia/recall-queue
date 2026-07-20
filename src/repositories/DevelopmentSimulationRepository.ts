import { PlayerModel } from "../models/PlayerModel.js";
import { QueueModel } from "../models/QueueModel.js";
import { SquadModel } from "../models/SquadModel.js";
import type { SimulationPlayerIdentity } from "../constants/developmentSimulation.js";

export class DevelopmentSimulationRepository {
  public async seedPlayers(
    players: readonly SimulationPlayerIdentity[],
  ): Promise<void> {
    await Promise.all(
      players.map((player) =>
        PlayerModel.findOneAndUpdate(
          {
            "discord.id": player.discordId,
          },
          {
            $set: {
              discord: {
                id: player.discordId,
                username: player.discordUsername,
              },
              game: {
                ign: player.ign,
                playerId: player.playerId,
                serverId: player.serverId,
              },
              rating: {
                rsr: player.rsr,
                confidence: 100,
              },
              statistics: {
                wins: 0,
                losses: 0,
                matchesPlayed: 0,
              },
              behavior: {
                score: 100,
                penalties: 0,
              },
              queue: {
                acceptedMatches: 0,
                declinedMatches: 0,
                bannedUntil: null,
                disciplineLevel: 0,
                lastPenaltyAt: null,
              },
              preferences: {
                roles: {
                  primary: player.primaryRole,
                  secondary: player.secondaryRole,
                  avoided: null,
                },
              },
            },
          },
          {
            upsert: true,
            returnDocument: "after",
            runValidators: true,
            setDefaultsOnInsert: true,
          },
        ).exec(),
      ),
    );
  }

  public async replaceQueue(
    guildId: string,
    discordIds: readonly string[],
  ): Promise<void> {
    const joinedAt = Date.now();

    await QueueModel.findOneAndUpdate(
      {
        guildId,
      },
      {
        $set: {
          status: "open",
          entries: discordIds.map((discordId, index) => ({
            discordId,
            joinedAt: new Date(joinedAt + index),
          })),
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).exec();
  }

  public async reset(
    guildId: string,
    ownerDiscordId: string,
    simulationDiscordIds: readonly string[],
  ): Promise<void> {
    await Promise.all([
      QueueModel.updateOne(
        { guildId },
        {
          $pull: {
            entries: {
              discordId: {
                $in: [ownerDiscordId, ...simulationDiscordIds],
              },
            },
          },
        },
      ).exec(),
      SquadModel.deleteMany({
        guildId,
        "participants.discordId": {
          $in: [...simulationDiscordIds],
        },
      }).exec(),
      PlayerModel.deleteMany({
        "discord.id": {
          $in: [...simulationDiscordIds],
        },
      }).exec(),
      PlayerModel.updateOne(
        {
          "discord.id": ownerDiscordId,
        },
        {
          $set: {
            "queue.bannedUntil": null,
            "queue.disciplineLevel": 0,
            "queue.lastPenaltyAt": null,
          },
        },
      ).exec(),
    ]);
  }
}
