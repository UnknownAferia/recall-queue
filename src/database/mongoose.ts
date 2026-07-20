import mongoose from "mongoose";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { formatError } from "../utils/formatError.js";

let connectionPromise: Promise<typeof mongoose> | null = null;

function registerConnectionListeners(): void {
  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connection established.");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB connection lost.");
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB connection restored.");
  });

  mongoose.connection.on("error", (error: unknown) => {
    logger.error(`MongoDB connection error:\n${formatError(error)}`);
  });
}

registerConnectionListeners();

export async function connectToMongoDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongodbUri, {
      dbName: env.mongodbDatabase,
      serverSelectionTimeoutMS: 10_000,
      connectTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      maxPoolSize: 10,
      minPoolSize: 1,
      autoIndex: false,
    });
  }

  try {
    await connectionPromise;
  } catch (error: unknown) {
    connectionPromise = null;
    throw error;
  }
}

export async function disconnectFromMongoDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
}