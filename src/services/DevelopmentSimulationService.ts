import {
  createSimulationDiscordId,
  createSimulationGameId,
  DevelopmentSimulationConfig,
  isSimulationDiscordId,
  type SimulationPlayerIdentity,
} from "../constants/developmentSimulation.js";
import { PlayerRoleLabels, PlayerRoles } from "../constants/playerRoles.js";
import { SquadConfig } from "../constants/squad.js";
import type { SquadDto } from "../dto/SquadDto.js";
import type { DevelopmentSimulationRepository } from "../repositories/DevelopmentSimulationRepository.js";
import type { PlayerService } from "./PlayerService.js";
import type { TeamFormationService } from "./TeamFormationService.js";
import { DevelopmentSimulationUnavailableError } from "./errors/DevelopmentSimulationUnavailableError.js";

interface DevelopmentSimulationConfiguration {
  readonly enabled: boolean;
  readonly databaseName: string;
}

export class DevelopmentSimulationService {
  public constructor(
    private readonly repository: DevelopmentSimulationRepository,
    private readonly playerService: PlayerService,
    private readonly teamFormationService: TeamFormationService,
    private readonly configuration: DevelopmentSimulationConfiguration,
  ) {}

  public get unavailableReason(): string | null {
    if (!this.configuration.enabled) {
      return "Set VORA_TEST_MODE=true to enable isolated squad simulations.";
    }

    if (
      !DevelopmentSimulationConfig.databaseNamePattern.test(
        this.configuration.databaseName,
      )
    ) {
      return "Test mode requires a database name ending in _development, _test or _sandbox.";
    }

    return null;
  }

  public async start(
    guildId: string,
    ownerDiscordId: string,
  ): Promise<SquadDto> {
    this.assertAvailable();

    const owner = await this.playerService.getByDiscordId(ownerDiscordId);

    if (!owner) {
      throw new DevelopmentSimulationUnavailableError(
        "Register your player profile in the development database first.",
      );
    }

    const primaryRole = owner.preferences.roles.primary;
    const secondaryRole = owner.preferences.roles.secondary;

    if (!primaryRole || !secondaryRole || primaryRole === secondaryRole) {
      throw new DevelopmentSimulationUnavailableError(
        "Configure valid primary and secondary roles before starting a test squad.",
      );
    }

    const activeSquad = await this.teamFormationService.getActiveSquadForPlayer(
      guildId,
      ownerDiscordId,
    );

    if (activeSquad) {
      throw new DevelopmentSimulationUnavailableError(
        "An open squad session already exists. Run /test-squad reset before starting again.",
      );
    }

    const simulationPlayers = this.createSimulationPlayers(
      guildId,
      owner.rating.rsr,
      primaryRole,
    );

    await this.repository.seedPlayers(simulationPlayers);
    await this.repository.replaceQueue(guildId, [
      ownerDiscordId,
      ...simulationPlayers.map((player) => player.discordId),
    ]);

    const createdSquad =
      await this.teamFormationService.tryCreateSquadFromQueue(guildId);

    if (!createdSquad) {
      throw new DevelopmentSimulationUnavailableError(
        "The simulation could not form a compatible squad.",
      );
    }

    let squad = createdSquad;

    for (const participant of createdSquad.participants) {
      if (
        participant.readyStatus === "pending" &&
        isSimulationDiscordId(participant.discordId)
      ) {
        squad = await this.teamFormationService.respondToReadyCheck(
          squad.id,
          guildId,
          participant.discordId,
          "accepted",
        );
      }
    }

    return squad;
  }

  public async reset(guildId: string, ownerDiscordId: string): Promise<void> {
    this.assertAvailable();

    await this.repository.reset(
      guildId,
      ownerDiscordId,
      this.createSimulationDiscordIds(guildId),
    );
  }

  public async confirmResultIfSimulated(squad: SquadDto): Promise<SquadDto> {
    if (this.unavailableReason || squad.status !== "result_pending") {
      return squad;
    }

    const simulationParticipants = squad.participants.filter((participant) =>
      isSimulationDiscordId(participant.discordId),
    );

    if (
      simulationParticipants.length !== DevelopmentSimulationConfig.playerCount
    ) {
      return squad;
    }

    let updatedSquad = squad;
    const confirmationsNeeded = Math.max(
      0,
      SquadConfig.resultConfirmationsRequired -
        (squad.result?.confirmedByDiscordIds.length ?? 0),
    );

    for (const participant of simulationParticipants.slice(
      0,
      confirmationsNeeded,
    )) {
      updatedSquad = await this.teamFormationService.respondToSquadResult(
        squad.id,
        squad.guildId,
        participant.discordId,
        "confirmed",
      );
    }

    return updatedSquad;
  }

  private assertAvailable(): void {
    const reason = this.unavailableReason;

    if (reason) {
      throw new DevelopmentSimulationUnavailableError(reason);
    }
  }

  private createSimulationDiscordIds(guildId: string): string[] {
    return Array.from(
      { length: DevelopmentSimulationConfig.playerCount },
      (_value, index) => createSimulationDiscordId(guildId, index + 1),
    );
  }

  private createSimulationPlayers(
    guildId: string,
    ownerRsr: number,
    ownerPrimaryRole: (typeof PlayerRoles)[number],
  ): SimulationPlayerIdentity[] {
    const availableRoles = PlayerRoles.filter(
      (role) => role !== ownerPrimaryRole,
    );
    const ratingOffsets = [-30, -10, 10, 30] as const;

    return availableRoles.map((primaryRole, index) => ({
      discordId: createSimulationDiscordId(guildId, index + 1),
      discordUsername: `Vora Test ${index + 1}`,
      ign: `Test ${PlayerRoleLabels[primaryRole]}`,
      playerId: createSimulationGameId(guildId, index + 1),
      serverId: `${9_900 + index}`,
      primaryRole,
      secondaryRole: ownerPrimaryRole,
      rsr: Math.max(0, ownerRsr + ratingOffsets[index]!),
    }));
  }
}
