import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { CommunityConfig } from "../../constants/community.js";
import type { CommunityDataRepository } from "../../repositories/CommunityDataRepository.js";
import type {
  ControlDataRepository,
  ControlDataSnapshot,
} from "../../repositories/ControlDataRepository.js";
import type {
  ControlServiceState,
  ControlSnapshot,
} from "../../types/control.js";
import type {
  WebsiteAnalyticsService,
  WebsiteAnalyticsSnapshot,
} from "./WebsiteAnalyticsService.js";

const SnapshotFileName = "control.json";

function percentage(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
}

function serviceState(
  heartbeatAt: Date | null,
  now: Date,
): ControlServiceState {
  const operational =
    heartbeatAt !== null &&
    now.getTime() - heartbeatAt.getTime() <=
      CommunityConfig.heartbeatOfflineAfterMs;

  return {
    status: operational ? "operational" : "unavailable",
    heartbeatAt: heartbeatAt?.toISOString() ?? null,
  };
}

function websiteSnapshot(
  analytics: WebsiteAnalyticsSnapshot | null,
): ControlSnapshot["website"] {
  if (!analytics) {
    return null;
  }

  return {
    periodDays: analytics.periodDays,
    pageViews: analytics.pageViews,
    discordClicks: analytics.discordClicks,
    pageToDiscordRate: analytics.pageToDiscordRate,
    onboardingToDiscordRate: analytics.onboardingToDiscordRate,
  };
}

export class ControlSnapshotService {
  public constructor(
    private readonly communityData: Pick<
      CommunityDataRepository,
      "getMatchmakingStatus"
    >,
    private readonly controlData: Pick<ControlDataRepository, "getSnapshot">,
    private readonly analytics: Pick<WebsiteAnalyticsService, "getSnapshot">,
    private readonly outputDirectory = process.env.VORA_PUBLIC_DATA_DIRECTORY?.trim() ||
      null,
  ) {}

  public async publish(
    guildId: string,
    guildName: string,
    now = new Date(),
  ): Promise<ControlSnapshot | null> {
    if (!this.outputDirectory) {
      return null;
    }

    const snapshot = await this.create(guildId, guildName, now);
    const target = join(this.outputDirectory, SnapshotFileName);
    const temporary = join(
      this.outputDirectory,
      `.${SnapshotFileName}.${process.pid}.tmp`,
    );

    await mkdir(this.outputDirectory, { recursive: true });
    await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o644,
    });
    await rename(temporary, target);

    return snapshot;
  }

  public async create(
    guildId: string,
    guildName: string,
    now = new Date(),
  ): Promise<ControlSnapshot> {
    const [status, data, analytics] = await Promise.all([
      this.communityData.getMatchmakingStatus(guildId, now),
      this.controlData.getSnapshot(guildId),
      this.analytics.getSnapshot(now),
    ]);

    return this.toSnapshot(guildName, now, status, data, analytics);
  }

  private toSnapshot(
    guildName: string,
    now: Date,
    status: Awaited<
      ReturnType<CommunityDataRepository["getMatchmakingStatus"]>
    >,
    data: ControlDataSnapshot,
    analytics: WebsiteAnalyticsSnapshot | null,
  ): ControlSnapshot {
    return {
      schemaVersion: 1,
      generatedAt: now.toISOString(),
      communityName: guildName.trim() || "Vora",
      services: {
        core: serviceState(status.coreHeartbeatAt, now),
        community: serviceState(data.communityHeartbeatAt, now),
      },
      access: {
        registrationOpen: status.registrationOpen,
        matchmakingOpen: status.matchmakingOpen,
        maintenanceReason: status.maintenanceReason,
      },
      players: {
        registered: data.registeredPlayers,
        verified: data.verifiedPlayers,
        pendingVerification: data.pendingVerification,
        rejectedVerification: data.rejectedVerification,
        verificationRate: percentage(
          data.verifiedPlayers,
          data.registeredPlayers,
        ),
      },
      queue: {
        waitingPlayers: status.queuedPlayers,
        readyChecks: status.readyChecks,
        activeSquads: status.activeSquads,
        pendingResults: status.pendingResults,
        disputedResults: status.disputedResults,
      },
      moderation: {
        openReports: data.openReports,
        pendingCases: data.pendingCases,
        openTickets: data.openTickets,
      },
      website: websiteSnapshot(analytics),
    };
  }
}
