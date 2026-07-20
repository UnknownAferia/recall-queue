import {
  isPlayerRole,
  normalizePlayerRole,
  type PlayerRole,
} from "../constants/playerRoles.js";

import type { PlayerDto } from "../dto/PlayerDto.js";
import { PlayerMapper } from "../mappers/PlayerMapper.js";
import type { PlayerRepository } from "../repositories/PlayerRepository.js";
import { LeaderboardConfig } from "../constants/leaderboard.js";

import type {
  CreatePlayerInput,
  PlayerRolePreferences,
  RolePreferenceSlot,
} from "../types/player.js";

import { GameAccountAlreadyRegisteredError } from "./errors/GameAccountAlreadyRegisteredError.js";
import { InvalidRegistrationDataError } from "./errors/InvalidRegistrationDataError.js";
import { InvalidRolePreferenceError } from "./errors/InvalidRolePreferenceError.js";
import { PlayerAlreadyRegisteredError } from "./errors/PlayerAlreadyRegisteredError.js";
import { PlayerProfileNotFoundError } from "./errors/PlayerProfileNotFoundError.js";

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

  public async getByDiscordIds(
    discordIds: readonly string[],
  ): Promise<PlayerDto[]> {
    const uniqueDiscordIds = [...new Set(discordIds)];
    const players =
      await this.playerRepository.findByDiscordIds(
        uniqueDiscordIds,
      );

    return players.map((player) => PlayerMapper.toDto(player));
  }

  public async getLeaderboard(): Promise<PlayerDto[]> {
    const players =
      await this.playerRepository.findHighestRated(
        LeaderboardConfig.maximumPlayers,
      );

    return players.map((player) =>
      PlayerMapper.toDto(player),
    );
  }

  public async setRolePreference(
    discordId: string,
    slot: RolePreferenceSlot,
    value: PlayerRole | null,
  ): Promise<PlayerDto> {
    if (value !== null && !isPlayerRole(value)) {
      throw new InvalidRolePreferenceError(
        "The selected Mobile Legends role is invalid.",
      );
    }

    if (
      (slot === "primary" || slot === "secondary") &&
      value === null
    ) {
      throw new InvalidRolePreferenceError(
        `${slot === "primary" ? "Primary" : "Secondary"} role cannot be empty.`,
      );
    }

    const player =
      await this.playerRepository.findByDiscordId(discordId);

    if (!player) {
      throw new PlayerProfileNotFoundError();
    }

    const preferences: PlayerRolePreferences = {
      primary: normalizePlayerRole(
        player.preferences?.roles?.primary,
      ),

      secondary: normalizePlayerRole(
        player.preferences?.roles?.secondary,
      ),

      avoided: normalizePlayerRole(
        player.preferences?.roles?.avoided,
      ),
    };

    if (slot === "primary" && value) {
      preferences.primary = value;

      if (preferences.secondary === value) {
        preferences.secondary = null;
      }

      if (preferences.avoided === value) {
        preferences.avoided = null;
      }
    }

    if (slot === "secondary" && value) {
      if (preferences.primary === value) {
        throw new InvalidRolePreferenceError(
          "Your secondary role must be different from your primary role.",
        );
      }

      preferences.secondary = value;

      if (preferences.avoided === value) {
        preferences.avoided = null;
      }
    }

    if (slot === "avoided") {
      if (
        value !== null &&
        (preferences.primary === value ||
          preferences.secondary === value)
      ) {
        throw new InvalidRolePreferenceError(
          "Your avoided role cannot also be a preferred role.",
        );
      }

      preferences.avoided = value;
    }

    const updatedPlayer =
      await this.playerRepository.updateRolePreferences(
        discordId,
        preferences,
      );

    if (!updatedPlayer) {
      throw new PlayerProfileNotFoundError();
    }

    return PlayerMapper.toDto(updatedPlayer);
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
