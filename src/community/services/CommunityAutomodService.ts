import { PermissionFlagsBits, type Message } from "discord.js";

import { CommunityModerationConfig } from "../../constants/communityModeration.js";

interface MessageSample {
  readonly at: number;
  readonly normalized: string;
}

export class CommunityAutomodService {
  private readonly samples = new Map<string, MessageSample[]>();

  public inspect(message: Message<true>, now = Date.now()): string | null {
    if (
      message.author.bot ||
      !message.member ||
      message.member.permissions.has(PermissionFlagsBits.ManageMessages)
    ) {
      return null;
    }

    if (
      message.mentions.everyone ||
      message.mentions.users.filter((user) => !user.bot).size >=
        CommunityModerationConfig.automodMassMentionCount
    ) {
      return "mass mentions";
    }

    const key = `${message.guildId}:${message.author.id}`;
    const normalized = message.content
      .trim()
      .toLocaleLowerCase()
      .replace(/\s+/g, " ")
      .slice(0, 500);
    const retained = (this.samples.get(key) ?? []).filter(
      (sample) =>
        now - sample.at <= CommunityModerationConfig.automodRepeatWindowMs,
    );
    retained.push({ at: now, normalized });
    this.samples.set(key, retained);

    const burst = retained.filter(
      (sample) => now - sample.at <= CommunityModerationConfig.automodWindowMs,
    ).length;

    if (burst >= CommunityModerationConfig.automodBurstMessages) {
      this.samples.delete(key);
      return "message flood";
    }

    if (
      normalized.length >= 4 &&
      retained.filter((sample) => sample.normalized === normalized).length >=
        CommunityModerationConfig.automodRepeatedMessages
    ) {
      this.samples.delete(key);
      return "repeated message spam";
    }

    return null;
  }
}
