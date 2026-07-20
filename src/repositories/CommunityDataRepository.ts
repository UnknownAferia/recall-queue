import { PlayerModel, type PlayerDocument } from "../models/PlayerModel.js";
import { QueueModel } from "../models/QueueModel.js";
import { ServiceHeartbeatModel } from "../models/ServiceHeartbeatModel.js";
import { SquadModel } from "../models/SquadModel.js";
import type { MatchmakingStatusSnapshot } from "../types/community.js";

interface CommunityDataConfiguration {
  readonly coreOfflineAfterMs: number;
}

export class CommunityDataRepository {
  public constructor(
    private readonly configuration: CommunityDataConfiguration,
  ) {}

  public async findHighestRated(limit: number): Promise<PlayerDocument[]> {
    return PlayerModel.find()
      .sort({
        "rating.rsr": -1,
        "statistics.wins": -1,
        createdAt: 1,
      })
      .limit(limit)
      .exec();
  }

  public async getMatchmakingStatus(
    guildId: string,
    now = new Date(),
  ): Promise<MatchmakingStatusSnapshot> {
    const [queue, statusCounts, heartbeat] = await Promise.all([
      QueueModel.findOne({ guildId }).exec(),
      SquadModel.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            guildId,
            status: {
              $in: ["ready_check", "active", "result_pending", "disputed"],
            },
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).exec(),
      ServiceHeartbeatModel.findOne({ service: "core" }).exec(),
    ]);
    const counts = new Map(
      statusCounts.map((entry) => [entry._id, entry.count]),
    );
    const heartbeatAt = heartbeat?.heartbeatAt
      ? new Date(heartbeat.heartbeatAt)
      : null;

    return {
      guildId,
      coreOnline:
        heartbeatAt !== null &&
        now.getTime() - heartbeatAt.getTime() <=
          this.configuration.coreOfflineAfterMs,
      coreHeartbeatAt: heartbeatAt,
      queueStatus: queue?.status ?? "open",
      queuedPlayers: queue?.entries.length ?? 0,
      readyChecks: counts.get("ready_check") ?? 0,
      activeSquads: counts.get("active") ?? 0,
      pendingResults: counts.get("result_pending") ?? 0,
      disputedResults: counts.get("disputed") ?? 0,
      capturedAt: new Date(now),
    };
  }
}
