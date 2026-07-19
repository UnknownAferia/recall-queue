import type { PlayerDto } from "../dto/PlayerDto.js";
import { PlayerMapper } from "../mappers/PlayerMapper.js";
import type { PlayerRepository } from "../repositories/PlayerRepository.js";
import type { CreatePlayerInput } from "../types/player.js";

import { GameAccountAlreadyRegisteredError } from "./errors/GameAccountAlreadyRegisteredError.js";
import { InvalidRegistrationDataError } from "./errors/InvalidRegistrationDataError.js";
import { PlayerAlreadyRegisteredError } from "./errors/PlayerAlreadyRegisteredError.js";

export class PlayerService {
  public constructor(
    private readonly playerRepository: PlayerRepository,
  ) {}

  public async registerPlayer(
    input: CreatePlayerInput,
  ): Promise<PlayerDto> {
    const normalizedInput =
      this.normalizeRegistrationInput(input);

    const existingDiscordPlayer =
      await this.playerRepository.existsByDiscordId(
        normalizedInput.discordId,
      );

    if (existingDiscordPlayer) {
      throw new PlayerAlreadyRegisteredError();
    }

    const existingGameAccount =
      await this.playerRepository.existsByGameAccount(
        normalizedInput.playerId,
        normalizedInput.serverId,
      );

    if (existingGameAccount) {
      throw new GameAccountAlreadyRegisteredError();
    }

    const player =
      await this.playerRepository.create(normalizedInput);

    return PlayerMapper.toDto(player);
  }

  public async isRegistered(
    discordId: string,
  ): Promise<boolean> {
    return this.playerRepository.existsByDiscordId(discordId);
  }

  public async getByDiscordId(
    discordId: string,
  ): Promise<PlayerDto | null> {
    const player =
      await this.playerRepository.findByDiscordId(discordId);

    return player ? PlayerMapper.toDto(player) : null;
  }

  private normalizeRegistrationInput(
    input: CreatePlayerInput,
  ): CreatePlayerInput {
    const normalizedInput: CreatePlayerInput = {
      discordId: input.discordId.trim(),
      discordUsername: input.discordUsername.trim(),
      ign: input.ign.trim().replace(/\s+/g, " "),
      playerId: input.playerId.trim(),
      serverId: input.serverId.trim(),
    };

    if (!normalizedInput.discordId) {
      throw new InvalidRegistrationDataError(
        "The Discord account could not be validated.",
      );
    }

    if (!normalizedInput.discordUsername) {
      throw new InvalidRegistrationDataError(
        "The Discord username could not be validated.",
      );
    }

    if (
      normalizedInput.ign.length < 2 ||
      normalizedInput.ign.length > 32
    ) {
      throw new InvalidRegistrationDataError(
        "Your in-game name must contain between 2 and 32 characters.",
      );
    }

    if (!/^\d{4,15}$/.test(normalizedInput.playerId)) {
      throw new InvalidRegistrationDataError(
        "The Player ID must contain between 4 and 15 digits.",
      );
    }

    if (!/^\d{1,8}$/.test(normalizedInput.serverId)) {
      throw new InvalidRegistrationDataError(
        "The Server ID must contain between 1 and 8 digits.",
      );
    }

    return normalizedInput;
  }
}