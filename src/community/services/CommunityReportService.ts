import {
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type Message,
} from "discord.js";

import {
  CommunityModerationConfig,
  formatCommunityReportReference,
} from "../../constants/communityModeration.js";
import { logger } from "../../config/logger.js";
import type { CommunityReportDocument } from "../../models/CommunityReportModel.js";
import type { CommunityModerationRepository } from "../../repositories/CommunityModerationRepository.js";
import { formatError } from "../../utils/formatError.js";
import { CommunityReportError } from "../errors/CommunityReportError.js";
import { createCommunityReportsView } from "../ui/createCommunityReportsView.js";
import { FixedWindowRateLimiter } from "./FixedWindowRateLimiter.js";
import type { ManagedCommunityChannelResolver } from "./ManagedCommunityChannelResolver.js";
import type { CommunityPanelPublisher } from "./CommunityPanelPublisher.js";

export class CommunityReportService {
  public constructor(
    private readonly repository: CommunityModerationRepository,
    private readonly channels: ManagedCommunityChannelResolver,
    private readonly publisher: CommunityPanelPublisher,
    private readonly rateLimiter = new FixedWindowRateLimiter(),
  ) {}

  public async submitMessageReport(
    guild: Guild,
    reporter: GuildMember,
    message: Message<true>,
    descriptionInput: string,
  ): Promise<CommunityReportDocument> {
    this.assertReporter(guild, reporter, message.author.id);
    if (message.author.bot) {
      throw new CommunityReportError("Bot messages cannot be reported here.");
    }
    const description = this.normalizeDescription(descriptionInput);
    this.consumeRateLimit(guild.id, reporter.id);
    await this.assertNotDuplicate(
      guild.id,
      reporter.id,
      message.author.id,
      message.id,
    );

    const report = await this.repository.createReport({
      guildId: guild.id,
      type: "message",
      reporterDiscordId: reporter.id,
      targetDiscordId: message.author.id,
      description,
      evidence: {
        channelId: message.channelId,
        messageId: message.id,
        messageContent: message.content.slice(0, 4_000) || null,
        attachmentUrls: [...message.attachments.values()]
          .map((attachment) => attachment.url)
          .slice(0, 10),
      },
    });

    await this.publishInbox(guild);
    return report;
  }

  public async submitUserReport(
    guild: Guild,
    reporter: GuildMember,
    targetDiscordId: string,
    descriptionInput: string,
  ): Promise<CommunityReportDocument> {
    this.assertReporter(guild, reporter, targetDiscordId);
    const target = await guild.members.fetch(targetDiscordId).catch(() => null);

    if (!target || target.user.bot) {
      throw new CommunityReportError(
        "This member is unavailable and cannot be reported.",
      );
    }

    const description = this.normalizeDescription(descriptionInput);
    this.consumeRateLimit(guild.id, reporter.id);
    await this.assertNotDuplicate(guild.id, reporter.id, targetDiscordId, null);

    const report = await this.repository.createReport({
      guildId: guild.id,
      type: "user",
      reporterDiscordId: reporter.id,
      targetDiscordId,
      description,
      evidence: {
        channelId: null,
        messageId: null,
        messageContent: null,
        attachmentUrls: [],
      },
    });

    await this.publishInbox(guild);
    return report;
  }

  public async getInbox(guildId: string): Promise<CommunityReportDocument[]> {
    return this.repository.findOpenReports(
      guildId,
      CommunityModerationConfig.reportInboxLimit,
    );
  }

  public async getOpenByNumber(
    guildId: string,
    reportNumber: number,
  ): Promise<CommunityReportDocument> {
    const report = await this.repository.findReportByNumber(
      guildId,
      reportNumber,
    );

    if (!report || report.status !== "open") {
      throw new CommunityReportError(
        "This report is unavailable or has already been resolved.",
      );
    }

    return report;
  }

  public async dismiss(
    guild: Guild,
    actor: GuildMember,
    reportNumber: number,
    noteInput: string,
  ): Promise<CommunityReportDocument> {
    this.assertStaff(actor);
    const report = await this.getOpenByNumber(guild.id, reportNumber);
    const note = this.normalizeDescription(noteInput).slice(0, 500);
    const resolved = await this.repository.resolveReport(
      report.id,
      "dismissed",
      actor.id,
      note,
      null,
      this.retentionDate(),
    );

    if (!resolved) {
      throw new CommunityReportError(
        "The report changed before it could be dismissed.",
      );
    }

    await this.publishInbox(guild);
    return resolved;
  }

  public async refreshInbox(guild: Guild): Promise<void> {
    await this.publishInbox(guild);
  }

  private assertReporter(
    guild: Guild,
    reporter: GuildMember,
    targetDiscordId: string,
  ): void {
    if (targetDiscordId === reporter.id) {
      throw new CommunityReportError("You cannot report yourself.");
    }

    if (targetDiscordId === guild.client.user.id) {
      throw new CommunityReportError("Vora cannot be reported here.");
    }
  }

  private assertStaff(actor: GuildMember): void {
    if (!actor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      throw new CommunityReportError(
        "You need the Moderate Members permission to manage reports.",
      );
    }
  }

  private consumeRateLimit(guildId: string, reporterDiscordId: string): void {
    const result = this.rateLimiter.consume(
      `community-report:${guildId}:${reporterDiscordId}`,
      CommunityModerationConfig.reportCreateLimit,
      CommunityModerationConfig.reportCreateWindowMs,
    );

    if (!result.allowed) {
      throw new CommunityReportError(
        `You have submitted too many reports. Try again in ${Math.ceil(result.retryAfterMs / 60_000)} minute(s).`,
      );
    }
  }

  private async assertNotDuplicate(
    guildId: string,
    reporterDiscordId: string,
    targetDiscordId: string,
    messageId: string | null,
  ): Promise<void> {
    const duplicate = await this.repository.findOpenDuplicateReport(
      guildId,
      reporterDiscordId,
      targetDiscordId,
      messageId,
    );

    if (duplicate) {
      throw new CommunityReportError(
        `You already have an open report for this target (${formatCommunityReportReference(duplicate.reportNumber)}).`,
      );
    }
  }

  private normalizeDescription(input: string): string {
    const description = input.trim().replace(/\s+/g, " ");

    if (description.length < 10 || description.length > 1_000) {
      throw new CommunityReportError(
        "A report description must contain between 10 and 1,000 characters.",
      );
    }

    return description;
  }

  private async publishInbox(guild: Guild): Promise<void> {
    try {
      const channel = await this.channels.resolveTextChannel(guild, "reports");

      if (!channel) {
        logger.warn(
          `Unable to publish Community reports in guild ${guild.id}: reports channel unavailable.`,
        );
        return;
      }

      const reports = await this.getInbox(guild.id);
      await this.publisher.publish(
        channel,
        "community_reports",
        createCommunityReportsView(reports),
      );
    } catch (error: unknown) {
      logger.error(
        `Unable to publish Community report inbox in guild ${guild.id}:\n${formatError(error)}`,
      );
    }
  }

  private retentionDate(): Date {
    return new Date(Date.now() + CommunityModerationConfig.recordRetentionMs);
  }
}
