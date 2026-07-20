import mongoose from "mongoose";

import { ServiceHeartbeatNames } from "../constants/community.js";
import type { ServiceHeartbeat } from "../types/community.js";

const { Schema } = mongoose;

export type ServiceHeartbeatDocument =
  mongoose.HydratedDocument<ServiceHeartbeat>;

const serviceHeartbeatSchema = new Schema<ServiceHeartbeat>(
  {
    service: {
      type: String,
      required: true,
      enum: ServiceHeartbeatNames,
    },
    heartbeatAt: { type: Date, required: true },
    startedAt: { type: Date, required: true },
  },
  {
    collection: "service_heartbeats",
    timestamps: true,
    versionKey: false,
  },
);

serviceHeartbeatSchema.index(
  { service: 1 },
  { name: "unique_service_heartbeat", unique: true },
);

export const ServiceHeartbeatModel: mongoose.Model<ServiceHeartbeat> =
  mongoose.models.ServiceHeartbeat ??
  mongoose.model<ServiceHeartbeat>("ServiceHeartbeat", serviceHeartbeatSchema);
