import { OperationalStateRepository } from "../repositories/OperationalStateRepository.js";
import type {
  MaintenanceScope,
  OperationalState,
} from "../types/operations.js";
import { SystemMaintenanceError } from "./errors/SystemMaintenanceError.js";

export class OperationalControlService {
  public constructor(
    private readonly repository = new OperationalStateRepository(),
  ) {}

  public async getState(): Promise<OperationalState> {
    const state = await this.repository.getOrCreate();
    return state.toObject();
  }

  public async setAccess(
    scope: MaintenanceScope,
    open: boolean,
    actorDiscordId: string,
    reason: string,
  ): Promise<OperationalState> {
    const normalizedReason = reason.trim().replace(/\s+/g, " ");
    if (normalizedReason.length < 5 || normalizedReason.length > 500) {
      throw new Error("A maintenance reason between 5 and 500 characters is required.");
    }
    const state = await this.repository.setAccess(
      scope,
      open,
      actorDiscordId,
      normalizedReason,
    );
    return state.toObject();
  }

  public async assertRegistrationOpen(): Promise<void> {
    if (!(await this.getState()).registrationOpen) {
      throw new SystemMaintenanceError("registration");
    }
  }

  public async assertMatchmakingOpen(): Promise<void> {
    if (!(await this.getState()).matchmakingOpen) {
      throw new SystemMaintenanceError("matchmaking");
    }
  }
}
