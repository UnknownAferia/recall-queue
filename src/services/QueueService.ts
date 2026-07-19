import type { QueueDocument } from "../models/QueueModel.js";
import type { PlayerRepository } from "../repositories/PlayerRepository.js";
import type { QueueRepository } from "../repositories/QueueRepository.js";

import { PlayerAlreadyInQueueError } from "./errors/PlayerAlreadyInQueueError.js";
import { PlayerNotInQueueError } from "./errors/PlayerNotInQueueError.js";
import { PlayerRegistrationRequiredError } from "./errors/PlayerRegistrationRequiredError.js";
import { QueueFullError } from "./errors/QueueFullError.js";
import { QueueLockedError } from "./errors/QueueLockedError.js";

export class QueueService {
  public constructor(
    private readonly queueRepository: QueueRepository,
    private readonly playerRepository: PlayerRepository,
  ) {}

  public async getQueue(guildId: string): Promise<QueueDocument> {
    return this.queueRepository.getOrCreate(guildId);
  }

  public async joinQueue(
    guildId: string,
    discordId: string,
  ): Promise<QueueDocument> {
    const playerExists =
      await this.playerRepository.existsByDiscordId(discordId);

    if (!playerExists) {
      throw new PlayerRegistrationRequiredError();
    }

    const currentQueue =
      await this.queueRepository.getOrCreate(guildId);

    if (currentQueue.status !== "open") {
      throw new QueueLockedError();
    }

    if (
      currentQueue.entries.some(
        (entry) => entry.discordId === discordId,
      )
    ) {
      throw new PlayerAlreadyInQueueError();
    }

    if (
      currentQueue.entries.length >=
      currentQueue.maximumPlayers
    ) {
      throw new QueueFullError();
    }

    const updatedQueue =
      await this.queueRepository.addPlayer(
        guildId,
        discordId,
      );

    if (updatedQueue) {
      return updatedQueue;
    }

    const latestQueue =
      await this.queueRepository.getOrCreate(guildId);

    if (
      latestQueue.entries.some(
        (entry) => entry.discordId === discordId,
      )
    ) {
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
    const updatedQueue =
      await this.queueRepository.removePlayer(
        guildId,
        discordId,
      );

    if (!updatedQueue) {
      throw new PlayerNotInQueueError();
    }

    return updatedQueue;
  }
}