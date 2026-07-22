import {
  OperationalStateModel,
  type OperationalStateDocument,
} from "../models/OperationalStateModel.js";
import type { MaintenanceScope } from "../types/operations.js";

export class OperationalStateRepository {
  public async getOrCreate(): Promise<OperationalStateDocument> {
    const state = await OperationalStateModel.findOneAndUpdate(
      { key: "global" },
      {
        $setOnInsert: {
          key: "global",
          registrationOpen: true,
          matchmakingOpen: true,
          reason: null,
          changedByDiscordId: null,
          changedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).exec();

    if (!state) {
      throw new Error("Unable to resolve Vora operational state.");
    }

    return state;
  }

  public async setAccess(
    scope: MaintenanceScope,
    open: boolean,
    actorDiscordId: string,
    reason: string,
  ): Promise<OperationalStateDocument> {
    const access: Record<string, boolean> = {};

    if (scope === "all" || scope === "registration") {
      access.registrationOpen = open;
    }
    if (scope === "all" || scope === "matchmaking") {
      access.matchmakingOpen = open;
    }

    const state = await OperationalStateModel.findOneAndUpdate(
      { key: "global" },
      {
        $set: {
          ...access,
          reason: open && scope === "all" ? null : reason,
          changedByDiscordId: actorDiscordId,
          changedAt: new Date(),
        },
        $setOnInsert: { key: "global" },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    ).exec();

    if (!state) {
      throw new Error("Unable to update Vora operational state.");
    }

    return state;
  }
}
