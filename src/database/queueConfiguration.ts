import { logger } from "../config/logger.js";
import { QueueConfig } from "../constants/queue.js";
import { QueueModel } from "../models/QueueModel.js";

export async function synchronizeQueueConfiguration(): Promise<void> {
  const result = await QueueModel.updateMany(
    {
      maximumPlayers: {
        $ne: QueueConfig.maximumPlayers,
      },
    },
    {
      $set: {
        maximumPlayers: QueueConfig.maximumPlayers,
      },
    },
    {
      runValidators: true,
    },
  ).exec();

  if (result.modifiedCount > 0) {
    logger.info(
      `Updated ${result.modifiedCount} queue configuration(s) for squad matchmaking.`,
    );
  }
}
