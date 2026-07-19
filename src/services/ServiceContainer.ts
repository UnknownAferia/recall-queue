import { PlayerRepository } from "../repositories/PlayerRepository.js";
import { QueueRepository } from "../repositories/QueueRepository.js";
import { PlayerService } from "./PlayerService.js";
import { QueueService } from "./QueueService.js";

export class ServiceContainer {
  public readonly player: PlayerService;
  public readonly queue: QueueService;

  public constructor() {
    const playerRepository = new PlayerRepository();
    const queueRepository = new QueueRepository();

    this.player = new PlayerService(playerRepository);

    this.queue = new QueueService(
      queueRepository,
      playerRepository,
    );
  }
}