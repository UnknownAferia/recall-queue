import { ChannelType, type Attachment, type Guild } from "discord.js";

import { GuildBlueprint } from "../config/guildBlueprint.js";
import { logger } from "../config/logger.js";
import {
  ResultEvidenceConfig,
  type ResultEvidenceContentType,
} from "../constants/resultEvidence.js";
import type { SquadResult } from "../constants/squad.js";
import type { SquadResultEvidence } from "../types/squad.js";
import { ResultEvidenceError } from "./errors/ResultEvidenceError.js";

export class ResultEvidenceService {
  public validate(attachment: Attachment): ResultEvidenceContentType {
    const contentType = attachment.contentType
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();

    if (
      !contentType ||
      attachment.width === null ||
      attachment.height === null ||
      !ResultEvidenceConfig.acceptedContentTypes.includes(
        contentType as ResultEvidenceContentType,
      )
    ) {
      throw new ResultEvidenceError(
        "Upload a PNG, JPEG or WebP screenshot of the Mobile Legends result screen.",
      );
    }

    if (
      attachment.size <= 0 ||
      attachment.size > ResultEvidenceConfig.maximumFileSizeBytes
    ) {
      throw new ResultEvidenceError(
        "The result screenshot must be no larger than 10 MB.",
      );
    }

    return contentType as ResultEvidenceContentType;
  }

  public async archive(
    guild: Guild,
    squadId: string,
    reporterDiscordId: string,
    outcome: SquadResult,
    attachment: Attachment,
  ): Promise<SquadResultEvidence> {
    const contentType = this.validate(attachment);
    const archiveChannel = await this.resolveArchiveChannel(guild);
    const submittedAt = new Date();

    try {
      const archiveMessage = await archiveChannel.send({
        content: [
          "## Match result evidence",
          `**Squad:** ${squadId}`,
          `**Reported result:** ${outcome === "win" ? "Victory" : "Defeat"}`,
          `**Submitted by:** <@${reporterDiscordId}>`,
          `**Submitted:** <t:${Math.floor(submittedAt.getTime() / 1_000)}:F>`,
        ].join("\n"),
        files: [
          {
            attachment: attachment.url,
            name: attachment.name,
            description: `Vora result evidence for squad ${squadId}`,
          },
        ],
        allowedMentions: { parse: [] },
      });

      const archivedAttachment = archiveMessage.attachments.first();

      if (!archivedAttachment) {
        await archiveMessage.delete().catch(() => undefined);
        throw new ResultEvidenceError(
          "Discord did not retain the uploaded screenshot. Please try again.",
        );
      }

      return {
        archiveChannelId: archiveChannel.id,
        archiveMessageId: archiveMessage.id,
        archiveAttachmentId: archivedAttachment.id,
        fileName: attachment.name,
        contentType,
        size: attachment.size,
        submittedByDiscordId: reporterDiscordId,
        submittedAt,
      };
    } catch (error: unknown) {
      if (error instanceof ResultEvidenceError) {
        throw error;
      }

      logger.error(
        `Unable to archive result evidence for squad ${squadId}: ${String(error)}`,
      );
      throw new ResultEvidenceError(
        "The screenshot could not be archived. Run /server-setup and verify the moderation-log channel before trying again.",
      );
    }
  }

  public async discard(
    guild: Guild,
    evidence: SquadResultEvidence,
  ): Promise<void> {
    try {
      const channel = await guild.channels.fetch(evidence.archiveChannelId);

      if (channel?.type !== ChannelType.GuildText) {
        return;
      }

      const message = await channel.messages
        .fetch(evidence.archiveMessageId)
        .catch(() => null);

      await message?.delete();
    } catch (error: unknown) {
      logger.warn(
        `Unable to remove unused result evidence ${evidence.archiveMessageId}: ${String(error)}`,
      );
    }
  }

  private async resolveArchiveChannel(guild: Guild) {
    await guild.channels.fetch();

    const channelBlueprint = GuildBlueprint.channels.find(
      (channel) => channel.key === "moderationLog",
    );
    const categoryBlueprint = GuildBlueprint.categories.find(
      (category) => category.key === channelBlueprint?.categoryKey,
    );
    const channel = guild.channels.cache.find(
      (candidate) =>
        candidate.type === ChannelType.GuildText &&
        candidate.name === channelBlueprint?.name &&
        candidate.parent?.name === categoryBlueprint?.name,
    );

    if (channel?.type !== ChannelType.GuildText) {
      throw new ResultEvidenceError(
        "The managed moderation-log channel is unavailable. Ask the server owner to run /server-setup.",
      );
    }

    return channel;
  }
}
