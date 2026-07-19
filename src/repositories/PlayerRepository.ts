import {
  PlayerModel,
  type PlayerDocument,
} from "../models/PlayerModel.js";

import type { CreatePlayerInput } from "../types/player.js";

export class PlayerRepository {
  public async findByDiscordId(
    discordId: string,
  ): Promise<PlayerDocument | null> {
    return PlayerModel.findOne({
      "discord.id": discordId,
    }).exec();
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

  public async existsByDiscordId(
    discordId: string,
  ): Promise<boolean> {
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

  public async create(
    input: CreatePlayerInput,
  ): Promise<PlayerDocument> {
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
}