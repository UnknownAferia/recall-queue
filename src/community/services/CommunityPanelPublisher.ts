import {
  AttachmentBuilder,
  MessageFlags,
  type ContainerBuilder,
  type TextChannel,
} from "discord.js";

import type { CommunityPanelKind } from "../../constants/community.js";
import type { BrandAsset } from "../../config/brand.js";
import type { CommunityPanelRepository } from "../../repositories/CommunityPanelRepository.js";

export class CommunityPanelPublisher {
  public constructor(private readonly repository: CommunityPanelRepository) {}

  public async publish(
    channel: TextChannel,
    kind: CommunityPanelKind,
    view: ContainerBuilder,
    asset?: BrandAsset,
    legacyKinds: readonly CommunityPanelKind[] = [],
  ): Promise<string> {
    const stored =
      (await this.repository.find(channel.guild.id, kind)) ??
      (legacyKinds.length > 0
        ? await this.repository.findAny(channel.guild.id, legacyKinds)
        : null);
    const existingMessage =
      stored?.channelId === channel.id
        ? await channel.messages.fetch(stored.messageId).catch(() => null)
        : null;

    if (existingMessage) {
      const assetAlreadyAttached =
        !asset ||
        existingMessage.attachments.some(
          (attachment) => attachment.name === asset.attachmentName,
        );

      await existingMessage.edit({
        components: [view],
        allowedMentions: { parse: [] },
        files:
          asset && !assetAlreadyAttached
            ? [
                new AttachmentBuilder(asset.filePath, {
                  name: asset.attachmentName,
                }),
              ]
            : [],
      });
      await this.migrateLegacyKind(
        channel.guild.id,
        stored!.kind,
        kind,
        channel.id,
        existingMessage.id,
      );
      return existingMessage.id;
    }

    const message = await channel.send({
      components: [view],
      allowedMentions: { parse: [] },
      files: asset
        ? [
            new AttachmentBuilder(asset.filePath, {
              name: asset.attachmentName,
            }),
          ]
        : [],
      flags: MessageFlags.IsComponentsV2,
    });

    await this.repository.upsert(
      channel.guild.id,
      kind,
      channel.id,
      message.id,
    );

    return message.id;
  }

  private async migrateLegacyKind(
    guildId: string,
    storedKind: CommunityPanelKind,
    currentKind: CommunityPanelKind,
    channelId: string,
    messageId: string,
  ): Promise<void> {
    if (storedKind === currentKind) {
      return;
    }

    await this.repository.upsert(guildId, currentKind, channelId, messageId);
    await this.repository.remove(guildId, storedKind);
  }
}
