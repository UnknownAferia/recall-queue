import { logger } from "../config/logger.js";
import { connectToMongoDB } from "./mongoose.js";
import { synchronizeDatabaseIndexes } from "./indexes.js";

export async function initializeDatabase(): Promise<void> {
  logger.info("Connecting to MongoDB...");

  await connectToMongoDB();
  await synchronizeDatabaseIndexes();

  logger.info("Database initialized successfully.");
}