import {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  type Client,
  type Guild,
} from "discord.js";
import mongoose from "mongoose";
import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { env } from "../config/env.js";
import { GuildBlueprint } from "../config/guildBlueprint.js";
import { PlayerVerificationModel } from "../models/PlayerVerificationModel.js";
import { QueueModel } from "../models/QueueModel.js";
import { ServiceHeartbeatModel } from "../models/ServiceHeartbeatModel.js";
import { SquadModel } from "../models/SquadModel.js";
import type {
  LaunchAuditCheck,
  LaunchAuditResult,
  RecoverySummary,
  SystemStatusSnapshot,
} from "../types/operations.js";
import { createAlertView } from "../ui/createAlertView.js";
import { auditDatabaseIndexes } from "../database/indexes.js";
import type { GuildSetupService } from "./GuildSetupService.js";
import type { OperationalControlService } from "./OperationalControlService.js";
import type { QueueVoiceService } from "./QueueVoiceService.js";
import type { ResultLifecycleExpirationService } from "./ResultLifecycleExpirationService.js";
import type { SquadVoiceService } from "./SquadVoiceService.js";
import type { TeamFormationService } from "./TeamFormationService.js";
import { OperationalAuditService } from "./OperationalAuditService.js";

const StaleVerificationAgeMs = 48 * 60 * 60 * 1_000;

export class SystemOperationsService {
  public constructor(
    private readonly operationalControl: OperationalControlService,
    private readonly guildSetup: GuildSetupService,
    private readonly teamFormation: TeamFormationService,
    private readonly resultLifecycle: ResultLifecycleExpirationService,
    private readonly queueVoice: QueueVoiceService,
    private readonly squadVoice: SquadVoiceService,
    private readonly auditTrail = new OperationalAuditService(),
  ) {}

  public async recordOperation(
    guildId: string,
    actorDiscordId: string | null,
    eventType:
      | "maintenance_changed"
      | "system_recovery_run"
      | "launch_audit_run"
      | "critical_alert_published",
    details: Readonly<Record<string, string | number | boolean | null>>,
  ): Promise<void> {
    await this.auditTrail.record({
      eventType,
      guildId,
      actorDiscordId,
      subjectType: "system",
      subjectId: "global",
      details,
    });
  }

  public async getStatus(now = new Date()): Promise<SystemStatusSnapshot> {
    const startedAt = Date.now();
    await mongoose.connection.db?.admin().ping();
    const databaseLatencyMs = Date.now() - startedAt;
    const staleBefore = new Date(now.getTime() - StaleVerificationAgeMs);

    const [
      state,
      heartbeats,
      queues,
      squadCounts,
      pendingVerifications,
      staleVerifications,
    ] = await Promise.all([
      this.operationalControl.getState(),
      ServiceHeartbeatModel.find({ service: { $in: ["core", "community"] } })
        .lean()
        .exec(),
      QueueModel.find({}).lean().exec(),
      SquadModel.aggregate<{ _id: string; count: number }>([
        {
          $match: {
            status: {
              $in: ["ready_check", "active", "result_pending", "disputed"],
            },
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).exec(),
      PlayerVerificationModel.countDocuments({ status: "pending" }).exec(),
      PlayerVerificationModel.countDocuments({
        status: "pending",
        submittedAt: { $lt: staleBefore },
      }).exec(),
    ]);
    const counts = new Map(squadCounts.map((entry) => [entry._id, entry.count]));
    const heartbeat = (service: "core" | "community") => {
      const value = heartbeats.find((entry) => entry.service === service)?.heartbeatAt;
      return value ? new Date(value) : null;
    };

    return {
      state,
      databaseLatencyMs,
      coreHeartbeatAt: heartbeat("core"),
      communityHeartbeatAt: heartbeat("community"),
      queuedPlayers: queues.reduce((sum, queue) => sum + queue.entries.length, 0),
      readyChecks: counts.get("ready_check") ?? 0,
      activeSquads: counts.get("active") ?? 0,
      pendingResults: counts.get("result_pending") ?? 0,
      disputedResults: counts.get("disputed") ?? 0,
      pendingVerifications,
      staleVerifications,
      capturedAt: new Date(now),
    };
  }

  public async recover(client: Client): Promise<RecoverySummary> {
    const [ready, results] = await Promise.all([
      this.teamFormation.cancelExpiredReadyChecks(),
      this.resultLifecycle.expireOverdueCases(),
    ]);
    let staleQueueEntries = 0;
    let restoredVoiceChannels = 0;
    let removedVoiceChannels = 0;
    const warnings: string[] = [];

    for (const guild of client.guilds.cache.values()) {
      const [queue, voice] = await Promise.all([
        this.queueVoice.reconcileGuild(guild),
        this.squadVoice.reconcileGuild(guild),
      ]);
      staleQueueEntries += queue.removedPlayers;
      restoredVoiceChannels += voice.restoredChannels;
      removedVoiceChannels += voice.removedChannels;
      if (!queue.queueLobbyAvailable) warnings.push(`${guild.name}: queue lobby missing`);
      if (!voice.categoryAvailable) warnings.push(`${guild.name}: squad voice category missing`);
    }

    return {
      expiredReadyChecks: ready.cancelledReadyChecks,
      expiredResultCases: results.expiredSquads.length,
      penalizedPlayers: ready.penalizedPlayers + results.penalizedPlayers,
      staleQueueEntries,
      restoredVoiceChannels,
      removedVoiceChannels,
      warnings,
    };
  }

  public async audit(client: Client): Promise<LaunchAuditResult> {
    const checks: LaunchAuditCheck[] = [];
    checks.push({
      name: "Production mode",
      level: env.testModeEnabled ? "failure" : "pass",
      detail: env.testModeEnabled ? "VORA_TEST_MODE is enabled." : "Test mode is disabled.",
    });
    checks.push({
      name: "Community configuration",
      level:
        process.env.VORA_COMMUNITY_DISCORD_TOKEN?.trim() &&
        process.env.VORA_COMMUNITY_DISCORD_CLIENT_ID?.trim()
          ? "pass"
          : "failure",
      detail: "Community token and application ID must both be configured.",
    });
    const unsafeDatabase = /(?:test|dev|drill|sandbox)/i.test(env.mongodbDatabase);
    checks.push({
      name: "Database target",
      level: unsafeDatabase ? "warning" : "pass",
      detail: `Connected to ${env.mongodbDatabase}.`,
    });

    for (const guildId of env.discordGuildIds) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        checks.push({ name: `Guild ${guildId}`, level: "failure", detail: "Core bot has no access." });
        continue;
      }
      const member = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
      checks.push({
        name: `${guild.name} administrator access`,
        level: member?.permissions.has(PermissionFlagsBits.Administrator) ? "pass" : "failure",
        detail: member?.permissions.has(PermissionFlagsBits.Administrator)
          ? "Administrator permission available."
          : "Administrator permission is missing.",
      });
      const plan = await this.guildSetup.createPlan(guild);
      checks.push({
        name: `${guild.name} blueprint`,
        level: plan.isComplete ? "pass" : "failure",
        detail: plan.isComplete
          ? "Roles, channels and permissions match the blueprint."
          : `${plan.rolesToCreate.length} roles, ${plan.categoriesToCreate.length} categories, ${plan.channelsToCreate.length} channels and ${plan.repairsRequired.length} repairs pending.`,
      });
    }

    const status = await this.getStatus();
    checks.push({
      name: "Community heartbeat",
      level:
        status.communityHeartbeatAt &&
        Date.now() - status.communityHeartbeatAt.getTime() <= 90_000
          ? "pass"
          : "failure",
      detail: status.communityHeartbeatAt
        ? `Last heartbeat ${status.communityHeartbeatAt.toISOString()}.`
        : "No Community heartbeat recorded.",
    });
    checks.push({
      name: "Stale verification requests",
      level: status.staleVerifications === 0 ? "pass" : "warning",
      detail: `${status.staleVerifications} pending request(s) older than 48 hours.`,
    });
    checks.push({
      name: "Database responsiveness",
      level: status.databaseLatencyMs < 1_000 ? "pass" : "warning",
      detail: `${status.databaseLatencyMs} ms ping latency.`,
    });
    const indexAudit = await auditDatabaseIndexes();
    checks.push({
      name: "MongoDB indexes",
      level:
        indexAudit.missingIndexes === 0 && indexAudit.obsoleteIndexes === 0
          ? "pass"
          : "failure",
      detail: `${indexAudit.models} models checked; ${indexAudit.missingIndexes} missing and ${indexAudit.obsoleteIndexes} obsolete index(es).`,
    });
    const backupDirectory = resolve(
      process.env.VORA_BACKUP_DIRECTORY?.trim() || "backups",
    );
    const backupFiles = existsSync(backupDirectory)
      ? readdirSync(backupDirectory)
          .filter((name) => name.endsWith(".archive.gz"))
          .map((name) => resolve(backupDirectory, name))
          .filter((path) => statSync(path).isFile())
      : [];
    const newestBackup = backupFiles.sort(
      (left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs,
    )[0];
    const maximumBackupAge = Number(
      process.env.VORA_BACKUP_MAX_AGE_MS || 86_400_000,
    );
    const backupCurrent =
      newestBackup !== undefined &&
      statSync(newestBackup).size >= 128 &&
      Date.now() - statSync(newestBackup).mtimeMs <= maximumBackupAge;
    checks.push({
      name: "Recent local backup",
      level: backupCurrent ? "pass" : "failure",
      detail: backupCurrent
        ? `Latest archive: ${newestBackup}`
        : "No recent non-empty backup archive is available.",
    });

    return { checks, capturedAt: new Date() };
  }

  public async publishCriticalAlert(
    guild: Guild,
    title: string,
    description: string,
  ): Promise<boolean> {
    await guild.channels.fetch();
    const blueprint = GuildBlueprint.channels.find((channel) => channel.key === "voraLog");
    const categoryName = GuildBlueprint.categories.find(
      (category) => category.key === blueprint?.categoryKey,
    )?.name;
    const channel = guild.channels.cache.find(
      (candidate) =>
        candidate.type === ChannelType.GuildText &&
        candidate.name === blueprint?.name &&
        candidate.parent?.name === categoryName,
    );
    if (channel?.type !== ChannelType.GuildText) return false;
    await channel.send({
      components: [createAlertView("error", title, description)],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });
    await this.recordOperation(guild.id, null, "critical_alert_published", {
      title,
      description,
    });
    return true;
  }
}
