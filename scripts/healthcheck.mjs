import "dotenv/config";

import mongoose from "mongoose";

const requestedService = process.argv[2];
const validServices = new Set(["core", "community"]);

if (requestedService && !validServices.has(requestedService)) {
  throw new Error("Healthcheck service must be core or community.");
}

const uri = process.env.MONGODB_URI?.trim();
const database = process.env.MONGODB_DATABASE?.trim();
const maximumAgeMs = Number(process.env.VORA_HEALTHCHECK_MAX_AGE_MS ?? "90000");

if (!uri || !database) {
  throw new Error("MONGODB_URI and MONGODB_DATABASE are required.");
}

if (!Number.isFinite(maximumAgeMs) || maximumAgeMs < 30000) {
  throw new Error("VORA_HEALTHCHECK_MAX_AGE_MS must be at least 30000.");
}

const services = requestedService ? [requestedService] : [...validServices];

try {
  await mongoose.connect(uri, {
    dbName: database,
    serverSelectionTimeoutMS: 8_000,
    maxPoolSize: 1,
  });

  const heartbeats = await mongoose.connection.db
    .collection("service_heartbeats")
    .find({ service: { $in: services } })
    .toArray();
  const byService = new Map(
    heartbeats.map((heartbeat) => [heartbeat.service, heartbeat]),
  );
  const now = Date.now();

  for (const service of services) {
    const heartbeat = byService.get(service);
    const heartbeatAt = heartbeat?.heartbeatAt;

    if (!(heartbeatAt instanceof Date)) {
      throw new Error(`${service} heartbeat is missing.`);
    }

    const ageMs = now - heartbeatAt.getTime();

    if (ageMs > maximumAgeMs) {
      throw new Error(`${service} heartbeat is ${ageMs}ms old.`);
    }
  }

  console.log(`Vora healthcheck passed for ${services.join(", ")}.`);
} finally {
  await mongoose.disconnect();
}
