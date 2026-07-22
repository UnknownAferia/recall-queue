import { ChannelType, type Guild, type TextChannel } from "discord.js";

import { GuildBlueprint } from "../../config/guildBlueprint.js";

export class ManagedCommunityChannelResolver {
  public async resolveTextChannel(
    guild: Guild,
    channelKey: string,
  ): Promise<TextChannel | null> {
    const blueprint = GuildBlueprint.channels.find(
      (channel) => channel.key === channelKey,
    );
    const categoryName = GuildBlueprint.categories.find(
      (category) => category.key === blueprint?.categoryKey,
    )?.name;

    if (!blueprint || !categoryName) {
      return null;
    }

    const channel = guild.channels.cache.find(
      (candidate) =>
        candidate.type === ChannelType.GuildText &&
        candidate.name === blueprint.name &&
        candidate.parent?.name === categoryName,
    );

    return channel?.type === ChannelType.GuildText ? channel : null;
  }

  public async resolveCategoryId(
    guild: Guild,
    categoryKey: string,
  ): Promise<string | null> {
    const blueprint = GuildBlueprint.categories.find(
      (category) => category.key === categoryKey,
    );
    const category = guild.channels.cache.find(
      (candidate) =>
        candidate.type === ChannelType.GuildCategory &&
        candidate.name === blueprint?.name,
    );

    return category?.id ?? null;
  }
}
