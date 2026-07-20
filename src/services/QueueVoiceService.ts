import {
  ChannelType,
  type Guild,
  type GuildMember,
  type VoiceChannel,
  type VoiceState,
} from "discord.js";

import { GuildBlueprint } from "../config/guildBlueprint.js";
import type { QueueService } from "./QueueService.js";

export interface QueueVoiceEligibility {
  readonly eligible: boolean;
  readonly queueLobby: VoiceChannel | null;
  readonly message: string | null;
}

export interface QueueVoiceReconciliationResult {
  readonly queueLobbyAvailable: boolean;
  readonly removedPlayers: number;
}

export class QueueVoiceService {
  public constructor(private readonly queueService: QueueService) {}

  public getEligibility(member: GuildMember): QueueVoiceEligibility {
    const queueLobby = this.resolveQueueLobby(member.guild);

    if (!queueLobby) {
      return {
        eligible: false,
        queueLobby: null,
        message:
          "The managed queue voice channel is unavailable. Ask the server owner to run `/server-setup`.",
      };
    }

    if (member.voice.channelId !== queueLobby.id) {
      return {
        eligible: false,
        queueLobby,
        message: `Join ${queueLobby.toString()} before entering matchmaking.`,
      };
    }

    return {
      eligible: true,
      queueLobby,
      message: null,
    };
  }

  public async handleVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState,
  ): Promise<boolean> {
    if (oldState.member?.user.bot) {
      return false;
    }

    const queueLobby = this.resolveQueueLobby(oldState.guild);

    if (
      !queueLobby ||
      oldState.channelId !== queueLobby.id ||
      newState.channelId === queueLobby.id
    ) {
      return false;
    }

    return this.queueService.leaveQueueIfPresent(
      oldState.guild.id,
      oldState.id,
    );
  }

  public async reconcileGuild(
    guild: Guild,
  ): Promise<QueueVoiceReconciliationResult> {
    await guild.channels.fetch();

    const queueLobby = this.resolveQueueLobby(guild);

    if (!queueLobby) {
      return {
        queueLobbyAvailable: false,
        removedPlayers: 0,
      };
    }

    const queue = await this.queueService.getQueue(guild.id);
    const connectedPlayerIds = new Set(
      guild.voiceStates.cache
        .filter((voiceState) => voiceState.channelId === queueLobby.id)
        .map((voiceState) => voiceState.id),
    );
    const stalePlayerIds = queue.entries
      .map((entry) => entry.discordId)
      .filter((discordId) => !connectedPlayerIds.has(discordId));

    const removedPlayers = await this.queueService.removePlayersIfPresent(
      guild.id,
      stalePlayerIds,
    );

    return {
      queueLobbyAvailable: true,
      removedPlayers,
    };
  }

  private resolveQueueLobby(guild: Guild): VoiceChannel | null {
    const channelBlueprint = GuildBlueprint.channels.find(
      (channel) => channel.key === "queueLobby",
    );

    if (!channelBlueprint) {
      return null;
    }

    const categoryBlueprint = GuildBlueprint.categories.find(
      (category) => category.key === channelBlueprint.categoryKey,
    );

    if (!categoryBlueprint) {
      return null;
    }

    const category = guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === categoryBlueprint.name,
    );

    if (!category) {
      return null;
    }

    return (
      guild.channels.cache.find(
        (channel): channel is VoiceChannel =>
          channel.type === ChannelType.GuildVoice &&
          channel.name === channelBlueprint.name &&
          channel.parentId === category.id,
      ) ?? null
    );
  }
}
