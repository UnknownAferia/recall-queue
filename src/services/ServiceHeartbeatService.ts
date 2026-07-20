import {
  CommunityConfig,
  type ServiceHeartbeatName,
} from "../constants/community.js";
import { logger } from "../config/logger.js";
import { ServiceHeartbeatRepository } from "../repositories/ServiceHeartbeatRepository.js";
import { formatError } from "../utils/formatError.js";

export class ServiceHeartbeatService {
  private readonly startedAt = new Date();
  private timer: NodeJS.Timeout | null = null;

  public constructor(
    private readonly service: ServiceHeartbeatName,
    private readonly repository = new ServiceHeartbeatRepository(),
  ) {}

  public async start(): Promise<void> {
    await this.update();

    this.timer = setInterval(() => {
      void this.update().catch((error: unknown) => {
        logger.error(
          `${this.service} heartbeat failed:\n${formatError(error)}`,
        );
      });
    }, CommunityConfig.heartbeatIntervalMs);
    this.timer.unref();
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async update(): Promise<void> {
    await this.repository.touch(this.service, this.startedAt, new Date());
  }
}
