import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ChannelType,
  Collection,
  type Guild,
  type GuildMember,
  type VoiceState,
} from "discord.js";

import { GuildBlueprint } from "../src/config/guildBlueprint.js";
import type { QueueDocument } from "../src/models/QueueModel.js";
import type { QueueService } from "../src/services/QueueService.js";
import { QueueVoiceService } from "../src/services/QueueVoiceService.js";

const guildId = "guild-id";
const categoryId = "vora-category";
const queueLobbyId = "queue-lobby";

function createGuild(connectedDiscordIds: readonly string[] = []): Guild {
  const categoryBlueprint = GuildBlueprint.categories.find(
    (category) => category.key === "vora",
  )!;
  const channelBlueprint = GuildBlueprint.channels.find(
    (channel) => channel.key === "queueLobby",
  )!;
  const channelCache = new Collection<string, unknown>([
    [
      categoryId,
      {
        id: categoryId,
        type: ChannelType.GuildCategory,
        name: categoryBlueprint.name,
      },
    ],
    [
      queueLobbyId,
      {
        id: queueLobbyId,
        type: ChannelType.GuildVoice,
        name: channelBlueprint.name,
        parentId: categoryId,
        toString: () => `<#${queueLobbyId}>`,
      },
    ],
  ]);
  const voiceStateCache = new Collection<string, VoiceState>(
    connectedDiscordIds.map((discordId) => [
      discordId,
      {
        id: discordId,
        channelId: queueLobbyId,
      } as VoiceState,
    ]),
  );

  return {
    id: guildId,
    channels: {
      cache: channelCache,
      fetch: async () => channelCache,
    },
    voiceStates: {
      cache: voiceStateCache,
    },
  } as unknown as Guild;
}

function createMember(guild: Guild, channelId: string | null): GuildMember {
  return {
    guild,
    user: {
      bot: false,
    },
    voice: {
      channelId,
    },
  } as unknown as GuildMember;
}

describe("Voice queue", () => {
  it("requires the exact managed queue-lobby channel", () => {
    const service = new QueueVoiceService({} as QueueService);
    const guild = createGuild();

    const wrongChannel = service.getEligibility(
      createMember(guild, "another-voice-channel"),
    );
    const queueLobby = service.getEligibility(
      createMember(guild, queueLobbyId),
    );

    assert.equal(wrongChannel.eligible, false);
    assert.match(wrongChannel.message ?? "", /<#queue-lobby>/);
    assert.equal(queueLobby.eligible, true);
    assert.equal(queueLobby.queueLobby?.id, queueLobbyId);
  });

  it("removes a queued player after leaving the queue lobby", async () => {
    const removedPlayers: string[] = [];
    const service = new QueueVoiceService({
      leaveQueueIfPresent: async (_guildId: string, discordId: string) => {
        removedPlayers.push(discordId);
        return true;
      },
    } as QueueService);
    const guild = createGuild();
    const oldState = {
      id: "player-id",
      guild,
      channelId: queueLobbyId,
      member: {
        user: {
          bot: false,
        },
      },
    } as VoiceState;
    const newState = {
      id: "player-id",
      guild,
      channelId: null,
    } as VoiceState;

    const removed = await service.handleVoiceStateUpdate(oldState, newState);

    assert.equal(removed, true);
    assert.deepEqual(removedPlayers, ["player-id"]);
  });

  it("keeps players queued during unrelated voice changes", async () => {
    let removeCalled = false;
    const service = new QueueVoiceService({
      leaveQueueIfPresent: async () => {
        removeCalled = true;
        return true;
      },
    } as QueueService);
    const guild = createGuild();

    const removed = await service.handleVoiceStateUpdate(
      {
        id: "player-id",
        guild,
        channelId: "community-lounge",
        member: {
          user: {
            bot: false,
          },
        },
      } as VoiceState,
      {
        id: "player-id",
        guild,
        channelId: null,
      } as VoiceState,
    );

    assert.equal(removed, false);
    assert.equal(removeCalled, false);
  });

  it("removes stale persisted entries during startup reconciliation", async () => {
    let removedIds: readonly string[] = [];
    const service = new QueueVoiceService({
      getQueue: async () =>
        ({
          entries: [
            { discordId: "connected-player", joinedAt: new Date() },
            { discordId: "stale-player", joinedAt: new Date() },
          ],
        }) as QueueDocument,
      removePlayersIfPresent: async (
        _guildId: string,
        discordIds: readonly string[],
      ) => {
        removedIds = discordIds;
        return discordIds.length;
      },
    } as QueueService);

    const result = await service.reconcileGuild(
      createGuild(["connected-player"]),
    );

    assert.equal(result.queueLobbyAvailable, true);
    assert.equal(result.removedPlayers, 1);
    assert.deepEqual(removedIds, ["stale-player"]);
  });
});
