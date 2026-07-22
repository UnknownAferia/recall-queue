import type { Guild } from "discord.js";

import { CommunityConfig } from "../../constants/community.js";
import { logger } from "../../config/logger.js";
import { formatError } from "../../utils/formatError.js";
import type { CommunityClient } from "../CommunityClient.js";

export class CommunityPanelJobs {
  private leaderboardTimer: NodeJS.Timeout | null = null;
  private statusTimer: NodeJS.Timeout | null = null;
  private retentionTimer: NodeJS.Timeout | null = null;
  private leaderboardRunning = false;
  private statusRunning = false;
  private retentionRunning = false;

  public constructor(private readonly client: CommunityClient) {}

  public async start(): Promise<void> {
    await Promise.all([
      this.synchronizeStaticPanels(),
      this.synchronizeLeaderboards(),
      this.synchronizeMatchmakingStatuses(),
      this.runTicketRetention(),
    ]);

    this.leaderboardTimer = setInterval(() => {
      void this.synchronizeLeaderboards();
    }, CommunityConfig.leaderboardRefreshIntervalMs);
    this.statusTimer = setInterval(() => {
      void this.synchronizeMatchmakingStatuses();
    }, CommunityConfig.matchmakingStatusRefreshIntervalMs);
    this.retentionTimer = setInterval(() => {
      void this.runTicketRetention();
    }, CommunityConfig.ticketRetentionSweepIntervalMs);
    this.leaderboardTimer.unref();
    this.statusTimer.unref();
    this.retentionTimer.unref();
  }

  public stop(): void {
    if (this.leaderboardTimer) {
      clearInterval(this.leaderboardTimer);
      this.leaderboardTimer = null;
    }

    if (this.statusTimer) {
      clearInterval(this.statusTimer);
      this.statusTimer = null;
    }

    if (this.retentionTimer) {
      clearInterval(this.retentionTimer);
      this.retentionTimer = null;
    }
  }

  private async synchronizeLeaderboards(): Promise<void> {
    if (this.leaderboardRunning) {
      return;
    }

    this.leaderboardRunning = true;

    try {
      await this.forEachGuild((guild) =>
        this.client.panels.synchronizeLeaderboard(guild),
      );
    } finally {
      this.leaderboardRunning = false;
    }
  }

  private async synchronizeStaticPanels(): Promise<void> {
    await this.forEachGuild(async (guild) => {
      await this.client.panels.synchronizeStaticPanels(guild);
    });
  }

  private async synchronizeMatchmakingStatuses(): Promise<void> {
    if (this.statusRunning) {
      return;
    }

    this.statusRunning = true;

    try {
      await this.forEachGuild((guild) =>
        this.client.panels.synchronizeMatchmakingStatus(guild),
      );
    } finally {
      this.statusRunning = false;
    }
  }

  private async runTicketRetention(): Promise<void> {
    if (this.retentionRunning) {
      return;
    }

    this.retentionRunning = true;

    try {
      await this.forEachGuild((guild) =>
        this.client.tickets.runRetention(guild),
      );
    } finally {
      this.retentionRunning = false;
    }
  }

  private async forEachGuild(
    operation: (guild: Guild) => Promise<void>,
  ): Promise<void> {
    await Promise.all(
      this.client.guilds.cache.map(async (guild) => {
        try {
          await operation(guild);
        } catch (error: unknown) {
          logger.error(
            `Community panel synchronization failed in guild ${guild.id}:\n${formatError(error)}`,
          );
        }
      }),
    );
  }
}
