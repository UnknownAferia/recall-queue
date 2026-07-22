import type { QueueDocument } from "../models/QueueModel.js";
import type { PlayerRepository } from "../repositories/PlayerRepository.js";
import type { QueueRepository } from "../repositories/QueueRepository.js";
import type { SquadRepository } from "../repositories/SquadRepository.js";

import { PlayerAlreadyInQueueError } from "./errors/PlayerAlreadyInQueueError.js";
import { PlayerAlreadyInActiveSquadError } from "./errors/PlayerAlreadyInActiveSquadError.js";
import { PlayerNotInQueueError } from "./errors/PlayerNotInQueueError.js";
import { PlayerRegistrationRequiredError } from "./errors/PlayerRegistrationRequiredError.js";
import { QueueAccessSuspendedError } from "./errors/QueueAccessSuspendedError.js";
import { QueueFullError } from "./errors/QueueFullError.js";
import { QueueLockedError } from "./errors/QueueLockedError.js";
import { RolePreferencesRequiredError } from "./errors/RolePreferencesRequiredError.js";
import { PlayerVerificationRequiredError } from "./errors/PlayerVerificationRequiredError.js";
import {
  isPlayerVerificationApproved,
  normalizePlayerVerificationStatus,
} from "../constants/playerVerification.js";
import type { OperationalControlService } from "./OperationalControlService.js";

export class QueueService {
  public constructor(
    private readonly queueRepository: QueueRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly squadRepository: SquadRepository,
    private readonly operationalControl?: OperationalControlService,
  ) {}

  public async getQueue(guildId: string): Promise<QueueDocument> {
    return this.queueRepository.getOrCreate(guildId);
  }

  public async getActiveSuspension(
    discordId: string,
    now = new Date(),
  ): Promise<Date | null> {
    const player = await this.playerRepository.findByDiscordId(discordId);
    const bannedUntil = player?.queue.bannedUntil ?? null;

    if (!bannedUntil || bannedUntil.getTime() <= now.getTime()) {
      return null;
    }

    return new Date(bannedUntil);
  }

  public async joinQueue(
    guildId: string,
    discordId: string,
  ): Promise<QueueDocument> {
    await this.operationalControl?.assertMatchmakingOpen();

    const player = await this.playerRepository.findByDiscordId(discordId);

    if (!player) {
      throw new PlayerRegistrationRequiredError();
    }

    const verificationStatus = normalizePlayerVerificationStatus(
      player.verification?.status,
    );

    if (!isPlayerVerificationApproved(verificationStatus)) {
      throw new PlayerVerificationRequiredError(verificationStatus);
    }

    const primaryRole = player.preferences?.roles?.primary ?? null;

    const secondaryRole = player.preferences?.roles?.secondary ?? null;

    if (!primaryRole || !secondaryRole) {
      throw new RolePreferencesRequiredError();
    }

    const bannedUntil = player.queue.bannedUntil;

    if (bannedUntil && bannedUntil.getTime() > Date.now()) {
      throw new QueueAccessSuspendedError(new Date(bannedUntil));
    }

    const playerHasActiveSquad =
      await this.squadRepository.existsActiveByDiscordId(guildId, discordId);

    if (playerHasActiveSquad) {
      throw new PlayerAlreadyInActiveSquadError();
    }

    const currentQueue = await this.queueRepository.getOrCreate(guildId);

    if (currentQueue.status !== "open") {
      throw new QueueLockedError();
    }

    if (currentQueue.entries.some((entry) => entry.discordId === discordId)) {
      throw new PlayerAlreadyInQueueError();
    }

    if (currentQueue.entries.length >= currentQueue.maximumPlayers) {
      throw new QueueFullError();
    }

    const updatedQueue = await this.queueRepository.addPlayer(
      guildId,
      discordId,
    );

    if (updatedQueue) {
      return updatedQueue;
    }

    const latestQueue = await this.queueRepository.getOrCreate(guildId);

    if (latestQueue.entries.some((entry) => entry.discordId === discordId)) {
      throw new PlayerAlreadyInQueueError();
    }

    if (latestQueue.status !== "open") {
      throw new QueueLockedError();
    }

    throw new QueueFullError();
  }

  public async leaveQueue(
    guildId: string,
    discordId: string,
  ): Promise<QueueDocument> {
    const updatedQueue = await this.queueRepository.removePlayer(
      guildId,
      discordId,
    );

    if (!updatedQueue) {
      throw new PlayerNotInQueueError();
    }

    return updatedQueue;
  }

  public async leaveQueueIfPresent(
    guildId: string,
    discordId: string,
  ): Promise<boolean> {
    const updatedQueue = await this.queueRepository.removePlayer(
      guildId,
      discordId,
    );

    return updatedQueue !== null;
  }

  public async removePlayersIfPresent(
    guildId: string,
    discordIds: readonly string[],
  ): Promise<number> {
    if (discordIds.length === 0) {
      return 0;
    }

    const queue = await this.queueRepository.getOrCreate(guildId);
    const queuedDiscordIds = new Set(
      queue.entries.map((entry) => entry.discordId),
    );
    const removableDiscordIds = [
      ...new Set(
        discordIds.filter((discordId) => queuedDiscordIds.has(discordId)),
      ),
    ];

    await this.queueRepository.removePlayers(guildId, removableDiscordIds);

    return removableDiscordIds.length;
  }
}
