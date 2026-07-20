import { logger } from "../config/logger.js";
import { connectToMongoDB } from "./mongoose.js";
import { synchronizeDatabaseIndexes } from "./indexes.js";
import { synchronizeQueueConfiguration } from "./queueConfiguration.js";
import { synchronizeSquadConfiguration } from "./squadConfiguration.js";
import { synchronizeRatingConfiguration } from "./ratingConfiguration.js";
import { synchronizeDisciplineConfiguration } from "./disciplineConfiguration.js";

export async function initializeDatabase(): Promise<void> {
  logger.info("Connecting to MongoDB...");

  await connectToMongoDB();
  await synchronizeQueueConfiguration();
  await synchronizeSquadConfiguration();
  await synchronizeRatingConfiguration();
  await synchronizeDisciplineConfiguration();
  await synchronizeDatabaseIndexes();

  logger.info("Database initialized successfully.");
}
