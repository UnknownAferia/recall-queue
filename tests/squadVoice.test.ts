import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ChannelType,
  Collection,
  OverwriteType,
  type Guild,
  type GuildMember,
  type GuildRole,
} from "discord.js";

import { GuildBlueprint } from "../src/config/guildBlueprint.js";
import type { SquadDto } from "../src/dto/SquadDto.js";
import type { SquadDocument } from "../src/models/SquadModel.js";
import type { SquadRepository } from "../src/repositories/SquadRepository.js";
import type { QueueVoiceService } from "../src/services/QueueVoiceService.js";
import { SquadVoiceService } from "../src/services/SquadVoiceService.js";
import { SquadVoiceUnavailableError } from "../src/services/errors/SquadVoiceUnavailableError.js";

const guildId = "guild-id";
const categoryId = "squad-voice-category";
const realPlayerId = "100000000000000001";
const botId = "100000000000000099";
const now = new Date("2026-07-20T12:00:00.000Z");

function createSquad(voiceChannelId: string | null = null): SquadDto {
  return {
    id: "507f1f77bcf86cd799439011",
    guildId,
    status: "active",
    captainDiscordId: realPlayerId,
    voiceChannelId,
    participants: [
      realPlayerId,
      "simulation:guild-id:1",
      "simulation:guild-id:2",
      "simulation:guild-id:3",
      "simulation:guild-id:4",
    ].map((discordId, index) => ({
      discordId,
      displayName: `Player ${index + 1}`,
      assignedRole: ["jungle", "exp", "gold", "mid", "roam"][index] as
        "jungle" | "exp" | "gold" | "mid" | "roam",
      roleFit: "primary",
      rsrBefore: 1_000,
      behaviorScore: 100,
      readyStatus: "accepted",
    })),
    metrics: {
      averageRsr: 1_000,
      rsrSpread: 0,
      averageBehaviorScore: 100,
      behaviorSpread: 0,
      rolePenalty: 0,
      totalCost: 0,
      compatibilityScore: 100,
    },
    result: null,
    readyCheckExpiresAt: now,
    activatedAt: now,
    closedAt: null,
    closedByDiscordId: null,
    createdAt: now,
    updatedAt: now,
  };
}

interface GuildFixture {
  readonly guild: Guild;
  readonly createdOptions: Record<string, unknown>[];
  readonly movedToChannelIds: string[];
  readonly deletedChannelIds: string[];
}

function createGuildFixture(includeCategory = true): GuildFixture {
  const categoryName = GuildBlueprint.categories.find(
    (category) => category.key === "squadVoice",
  )!.name;
  const channelCache = new Collection<string, unknown>();
  const roleCache = new Collection<string, GuildRole>();
  const createdOptions: Record<string, unknown>[] = [];
  const movedToChannelIds: string[] = [];
  const deletedChannelIds: string[] = [];

  if (includeCategory) {
    channelCache.set(categoryId, {
      id: categoryId,
      type: ChannelType.GuildCategory,
      name: categoryName,
    });
  }

  const realMember = {
    id: realPlayerId,
    user: { bot: false },
    voice: {
      channelId: "queue-lobby",
      setChannel: async (channel: { id: string }) => {
        movedToChannelIds.push(channel.id);
      },
    },
  } as unknown as GuildMember;
  const botMember = {
    id: botId,
    user: { bot: true },
  } as GuildMember;

  const guild = {
    id: guildId,
    channels: {
      cache: channelCache,
      fetch: async () => channelCache,
      create: async (options: Record<string, unknown>) => {
        createdOptions.push(options);
        const id = `private-voice-${createdOptions.length}`;
        const channel = {
          id,
          type: ChannelType.GuildVoice,
          name: options.name,
          parentId: options.parent,
          delete: async () => {
            deletedChannelIds.push(id);
            channelCache.delete(id);
          },
        };
        channelCache.set(id, channel);
        return channel;
      },
    },
    roles: {
      everyone: { id: guildId },
      cache: roleCache,
      fetch: async () => roleCache,
    },
    members: {
      me: botMember,
      fetch: async (discordId: string) =>
        discordId === realPlayerId ? realMember : null,
    },
  } as unknown as Guild;

  return {
    guild,
    createdOptions,
    movedToChannelIds,
    deletedChannelIds,
  };
}

describe("Private squad voice", () => {
  it("creates a private channel, persists it and ignores simulated members", async () => {
    const fixture = createGuildFixture();
    let persistedChannelId: string | null = null;
    const service = new SquadVoiceService(
      {
        setVoiceChannelId: async (
          _squadId: string,
          _guildId: string,
          voiceChannelId: string,
        ) => {
          persistedChannelId = voiceChannelId;
          return true;
        },
      } as SquadRepository,
      {
        getEligibility: () => ({
          eligible: true,
          queueLobby: null,
          message: null,
        }),
      } as QueueVoiceService,
    );

    const result = await service.ensureVoiceChannel(
      fixture.guild,
      createSquad(),
    );

    assert.equal(result.voiceChannelId, "private-voice-1");
    assert.equal(persistedChannelId, "private-voice-1");
    assert.deepEqual(fixture.movedToChannelIds, ["private-voice-1"]);
    assert.equal(fixture.createdOptions.length, 1);
    assert.equal(fixture.createdOptions[0]?.userLimit, 5);

    const overwrites = fixture.createdOptions[0]?.permissionOverwrites as {
      id: string;
      type: OverwriteType;
    }[];

    assert.ok(
      overwrites.some(
        (overwrite) =>
          overwrite.id === realPlayerId &&
          overwrite.type === OverwriteType.Member,
      ),
    );
    assert.ok(overwrites.some((overwrite) => overwrite.id === botId));
    assert.equal(
      overwrites.some((overwrite) => overwrite.id.startsWith("simulation:")),
      false,
    );
  });

  it("deletes only a managed channel and clears its stored reference", async () => {
    const fixture = createGuildFixture();
    const clearedChannelIds: string[] = [];
    const repository = {
      setVoiceChannelId: async () => true,
      clearVoiceChannelId: async (
        _squadId: string,
        _guildId: string,
        voiceChannelId: string,
      ) => {
        clearedChannelIds.push(voiceChannelId);
      },
    } as SquadRepository;
    const service = new SquadVoiceService(repository, {
      getEligibility: () => ({
        eligible: false,
        queueLobby: null,
        message: null,
      }),
    } as QueueVoiceService);
    const activeSquad = await service.ensureVoiceChannel(
      fixture.guild,
      createSquad(),
    );

    const removed = await service.cleanupVoiceChannel(
      fixture.guild,
      activeSquad,
    );

    assert.equal(removed, true);
    assert.deepEqual(fixture.deletedChannelIds, ["private-voice-1"]);
    assert.deepEqual(clearedChannelIds, ["private-voice-1"]);
  });

  it("fails safely when the managed squad category is unavailable", async () => {
    const fixture = createGuildFixture(false);
    const service = new SquadVoiceService(
      {} as SquadRepository,
      {} as QueueVoiceService,
    );

    await assert.rejects(
      service.ensureVoiceChannel(fixture.guild, createSquad()),
      SquadVoiceUnavailableError,
    );

    assert.equal(fixture.createdOptions.length, 0);
  });

  it("reuses the channel won by a concurrent provisioning request", async () => {
    const fixture = createGuildFixture();
    const winnerChannelId = "winner-channel";
    const repository = {
      setVoiceChannelId: async () => {
        const channelName = fixture.createdOptions[0]?.name;

        fixture.guild.channels.cache.set(winnerChannelId, {
          id: winnerChannelId,
          type: ChannelType.GuildVoice,
          name: channelName,
          parentId: categoryId,
          delete: async () => undefined,
        } as never);

        return false;
      },
      findById: async () =>
        createSquad(winnerChannelId) as unknown as SquadDocument,
    } as SquadRepository;
    const service = new SquadVoiceService(repository, {
      getEligibility: () => ({
        eligible: true,
        queueLobby: null,
        message: null,
      }),
    } as QueueVoiceService);

    const result = await service.ensureVoiceChannel(
      fixture.guild,
      createSquad(),
    );

    assert.equal(result.voiceChannelId, winnerChannelId);
    assert.deepEqual(fixture.deletedChannelIds, ["private-voice-1"]);
    assert.deepEqual(fixture.movedToChannelIds, [winnerChannelId]);
  });
});
