import {
  ChannelType,
  type Attachment,
  type Guild,
} from "discord.js";

import { GuildBlueprint } from "../config/guildBlueprint.js";
import { logger } from "../config/logger.js";
import {
  PlayerVerificationConfig,
  type PlayerVerificationContentType,
} from "../constants/playerVerification.js";
import type { PlayerDto } from "../dto/PlayerDto.js";
import type { PlayerVerificationEvidence } from "../types/playerVerification.js";
import { createPendingPlayerVerificationReviewView } from "../ui/createPlayerVerificationReviewView.js";
import { PlayerVerificationError } from "./errors/PlayerVerificationError.js";

export class PlayerVerificationEvidenceService {
  public validate(attachment: Attachment): PlayerVerificationContentType {
    const contentType = attachment.contentType
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();

    if (
      !contentType ||
      attachment.width === null ||
      attachment.height === null ||
      !PlayerVerificationConfig.acceptedContentTypes.includes(
        contentType as PlayerVerificationContentType,
      )
    ) {
      throw new PlayerVerificationError(
        "Upload a PNG, JPEG or WebP screenshot of your Mobile Legends profile.",
      );
    }

    if (
      attachment.size <= 0 ||
      attachment.size > PlayerVerificationConfig.maximumFileSizeBytes
    ) {
      throw new PlayerVerificationError(
        "The verification screenshot must be no larger than 10 MB.",
      );
    }

    return contentType as PlayerVerificationContentType;
  }

  public async archive(
    guild: Guild,
    requestId: string,
    player: PlayerDto,
    attachment: Attachment,
  ): Promise<PlayerVerificationEvidence> {
    const contentType = this.validate(attachment);
    const channel = await this.resolveReviewChannel(guild);

    try {
      const message = await channel.send({
        ...createPendingPlayerVerificationReviewView(requestId, player),
        files: [
          {
            attachment: attachment.url,
            name: attachment.name,
            description: `Vora account verification for ${player.game.ign}`,
          },
        ],
        allowedMentions: { parse: [] },
      });
      const archivedAttachment = message.attachments.first();

      if (!archivedAttachment) {
        await message.delete().catch(() => undefined);
        throw new PlayerVerificationError(
          "Discord did not retain the verification screenshot. Please try again.",
        );
      }

      return {
        archiveChannelId: channel.id,
        archiveMessageId: message.id,
        archiveAttachmentId: archivedAttachment.id,
        fileName: archivedAttachment.name,
        contentType,
        size: attachment.size,
      };
    } catch (error: unknown) {
      if (error instanceof PlayerVerificationError) {
        throw error;
      }

      logger.error(
        `Unable to archive player verification ${requestId}: ${String(error)}`,
      );
      throw new PlayerVerificationError(
        "The verification request could not be delivered to Operations. Ask the server owner to run `/server-setup` and try again.",
      );
    }
  }

  public async discard(
    guild: Guild,
    evidence: PlayerVerificationEvidence,
  ): Promise<boolean> {
    try {
      const channel = await guild.channels.fetch(evidence.archiveChannelId);

      if (channel?.type !== ChannelType.GuildText) {
        return false;
      }

      const message = await channel.messages
        .fetch(evidence.archiveMessageId)
        .catch(() => null);

      if (!message) {
        return false;
      }

      await message.delete();
      return true;
    } catch (error: unknown) {
      logger.warn(
        `Unable to remove unused verification evidence ${evidence.archiveMessageId}: ${String(error)}`,
      );
      return false;
    }
  }

  private async resolveReviewChannel(guild: Guild) {
    await guild.channels.fetch();

    const channelBlueprint = GuildBlueprint.channels.find(
      (channel) => channel.key === "accountVerifications",
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
      throw new PlayerVerificationError(
        "The managed account-verification channel is unavailable. Ask the server owner to run `/server-setup`.",
      );
    }

    return channel;
  }
}
