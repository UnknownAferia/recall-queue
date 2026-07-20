import { PlayerModel } from "../models/PlayerModel.js";

export async function synchronizeDisciplineConfiguration(): Promise<void> {
  await PlayerModel.bulkWrite([
    {
      updateMany: {
        filter: { "queue.disciplineLevel": { $exists: false } },
        update: { $set: { "queue.disciplineLevel": 0 } },
      },
    },
    {
      updateMany: {
        filter: { "queue.lastPenaltyAt": { $exists: false } },
        update: { $set: { "queue.lastPenaltyAt": null } },
      },
    },
  ]);
}
