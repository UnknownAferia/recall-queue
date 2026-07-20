import type { ServiceHeartbeatName } from "../constants/community.js";
import {
  ServiceHeartbeatModel,
  type ServiceHeartbeatDocument,
} from "../models/ServiceHeartbeatModel.js";

export class ServiceHeartbeatRepository {
  public async touch(
    service: ServiceHeartbeatName,
    startedAt: Date,
    heartbeatAt: Date,
  ): Promise<ServiceHeartbeatDocument> {
    const heartbeat = await ServiceHeartbeatModel.findOneAndUpdate(
      { service },
      {
        $set: { heartbeatAt, startedAt },
        $setOnInsert: { service },
      },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).exec();

    if (!heartbeat) {
      throw new Error(`Unable to update ${service} service heartbeat.`);
    }

    return heartbeat;
  }
}
