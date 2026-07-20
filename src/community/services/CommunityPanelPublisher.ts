import {
  MessageFlags,
  type ContainerBuilder,
  type TextChannel,
} from "discord.js";

import type { CommunityPanelKind } from "../../constants/community.js";
import type { CommunityPanelRepository } from "../../repositories/CommunityPanelRepository.js";

export class CommunityPanelPublisher {
  public constructor(private readonly repository: CommunityPanelRepository) {}

  public async publish(
    channel: TextChannel,
    kind: CommunityPanelKind,
    view: ContainerBuilder,
  ): Promise<string> {
    const stored = await this.repository.find(channel.guild.id, kind);
    const existingMessage =
      stored?.channelId === channel.id
        ? await channel.messages.fetch(stored.messageId).catch(() => null)
        : null;

    if (existingMessage) {
      await existingMessage.edit({ components: [view] });
      return existingMessage.id;
    }

    const message = await channel.send({
      components: [view],
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
}
