import { logger } from "../config/logger.js";
import { SquadConfig } from "../constants/squad.js";
import type { SquadDto } from "../dto/SquadDto.js";
import { formatError } from "../utils/formatError.js";
import type { TeamFormationService } from "./TeamFormationService.js";

type ReadyCheckViewEditor = (squad: SquadDto) => Promise<void>;

export class ReadyCheckExpirationService {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  public constructor(
    private readonly teamFormationService: TeamFormationService,
    private readonly updateGraceMs = SquadConfig.readyCheckViewUpdateGraceMs,
  ) {}

  public schedule(
    squad: SquadDto,
    messageId: string,
    editView: ReadyCheckViewEditor,
  ): void {
    if (squad.status !== "ready_check") {
      return;
    }

    const key = this.createKey(squad.id, messageId);
    this.cancelByKey(key);

    const delay = Math.max(
      0,
      squad.readyCheckExpiresAt.getTime() - Date.now() + this.updateGraceMs,
    );
    const timer = setTimeout(
      () => void this.expire(key, squad.id, editView),
      delay,
    );

    timer.unref();
    this.timers.set(key, timer);
  }

  public cancel(squadId: string, messageId: string): void {
    this.cancelByKey(this.createKey(squadId, messageId));
  }

  private async expire(
    key: string,
    squadId: string,
    editView: ReadyCheckViewEditor,
  ): Promise<void> {
    this.timers.delete(key);

    try {
      const squad = await this.teamFormationService.expireReadyCheck(squadId);

      if (squad?.status === "cancelled") {
        await editView(squad);
      }
    } catch (error: unknown) {
      logger.error(
        `Unable to update expired ready-check view for squad ${squadId}:\n${formatError(error)}`,
      );
    }
  }

  private cancelByKey(key: string): void {
    const timer = this.timers.get(key);

    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  private createKey(squadId: string, messageId: string): string {
    return `${squadId}:${messageId}`;
  }
}
