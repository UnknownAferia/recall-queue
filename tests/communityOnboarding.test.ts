import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  Collection,
  PermissionFlagsBits,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Guild,
  type GuildMember,
  type TextChannel,
} from "discord.js";

import { CommunityCustomIds } from "../src/constants/community.js";
import type { PlayerDto } from "../src/dto/PlayerDto.js";
import { MemberOnboardingModel } from "../src/models/MemberOnboardingModel.js";
import type { MemberOnboardingRepository } from "../src/repositories/MemberOnboardingRepository.js";
import type { PlayerVerificationRepository } from "../src/repositories/PlayerVerificationRepository.js";
import type { PlayerService } from "../src/services/PlayerService.js";
import { CommunityOnboardingService } from "../src/community/services/CommunityOnboardingService.js";
import type { ManagedCommunityChannelResolver } from "../src/community/services/ManagedCommunityChannelResolver.js";
import { createMemberOnboardingView } from "../src/community/ui/createMemberOnboardingView.js";
import { createOnboardingDashboardView } from "../src/community/ui/createOnboardingDashboardView.js";
import type { CommunityClient } from "../src/community/CommunityClient.js";
import { handleCommunityOnboardingInteraction } from "../src/community/handleCommunityOnboardingInteraction.js";
import { CustomIds } from "../src/constants/customIds.js";
import { executeOnboardingCommand } from "../src/community/commands/onboarding.js";

function player(discordId: string, status: "pending" | "verified"): PlayerDto {
  return {
    discord: { id: discordId },
    verification: { status },
  } as PlayerDto;
}

function member(
  id: string,
  guild: Guild,
  bot = false,
  send?: (options: unknown) => Promise<unknown>,
): GuildMember {
  return {
    id,
    guild,
    user: { id, bot },
    send: send ?? (async () => ({})),
  } as unknown as GuildMember;
}

describe("Community onboarding", () => {
  it("starts with a Components V2 response before rendering the dashboard", async () => {
    const replies: unknown[] = [];
    const edits: unknown[] = [];
    const client = {
      onboarding: {
        getSnapshot: async () => ({
          members: 10,
          registered: 4,
          verified: 2,
          unregistered: 6,
          verificationRequired: 1,
          awaitingOperationsReview: 1,
          reminderEligible: 6,
        }),
      },
    } as unknown as CommunityClient;
    const interaction = {
      inCachedGuild: () => true,
      memberPermissions: {
        has: (permission: bigint) =>
          permission === PermissionFlagsBits.ManageMessages,
      },
      guild: {},
      reply: async (options: unknown) => {
        replies.push(options);
      },
      editReply: async (options: unknown) => {
        edits.push(options);
      },
    } as unknown as ChatInputCommandInteraction<"cached">;

    await executeOnboardingCommand(client, interaction);

    assert.equal(replies.length, 1);
    assert.match(JSON.stringify(replies[0]), /Loading Onboarding/);
    assert.equal(edits.length, 1);
    assert.match(JSON.stringify(edits[0]), /Player Onboarding/);
  });

  it("acknowledges reminder batches with a Components V2 update", async () => {
    const updates: unknown[] = [];
    const edits: unknown[] = [];
    let reminderBatches = 0;
    const client = {
      onboarding: {
        remindEligible: async () => {
          reminderBatches += 1;
          return {
            eligible: 31,
            attempted: 25,
            delivered: 24,
            failed: 1,
          };
        },
        getSnapshot: async () => ({
          members: 35,
          registered: 7,
          verified: 4,
          unregistered: 28,
          verificationRequired: 2,
          awaitingOperationsReview: 1,
          reminderEligible: 6,
        }),
      },
    } as unknown as CommunityClient;
    const interaction = {
      isButton: () => true,
      isModalSubmit: () => false,
      isChatInputCommand: () => false,
      customId: CommunityCustomIds.onboarding.nudge,
      inCachedGuild: () => true,
      memberPermissions: {
        has: (permission: bigint) =>
          permission === PermissionFlagsBits.ManageMessages,
      },
      guild: {},
      update: async (options: unknown) => {
        updates.push(options);
      },
      editReply: async (options: unknown) => {
        edits.push(options);
      },
    } as unknown as ButtonInteraction<"cached">;

    assert.equal(
      await handleCommunityOnboardingInteraction(client, interaction),
      true,
    );
    assert.equal(reminderBatches, 1);
    assert.equal(updates.length, 1);
    assert.match(JSON.stringify(updates[0]), /Sending Reminders/);
    assert.equal(edits.length, 1);
    assert.match(JSON.stringify(edits[0]), /24 reminder\(s\) delivered/);
    assert.match(JSON.stringify(edits[0]), /6 remain eligible/);
  });

  it("serializes direct registration controls and the Operations dashboard", () => {
    const prompt = JSON.stringify(
      createMemberOnboardingView(
        "https://discord.com/channels/guild/register",
      ).toJSON(),
    );
    const dashboard = JSON.stringify(
      createOnboardingDashboardView({
        members: 10,
        registered: 4,
        verified: 2,
        unregistered: 6,
        verificationRequired: 1,
        awaitingOperationsReview: 1,
        reminderEligible: 6,
      }).toJSON(),
    );

    assert.match(prompt, /Your Team Starts Here/);
    assert.match(prompt, new RegExp(CommunityCustomIds.onboarding.register));
    assert.match(prompt, /https:\/\/discord\.com\/channels\/guild\/register/);
    assert.match(dashboard, /Player Onboarding/);
    assert.match(dashboard, /Registered:\*\* 4 · 40%/);
    assert.match(dashboard, new RegExp(CommunityCustomIds.onboarding.nudge));
  });

  it("counts only human members and respects the reminder cooldown", async () => {
    const now = new Date("2026-07-26T12:00:00.000Z");
    let listCalls = 0;
    const guild = {
      id: "guild-id",
      members: {
        list: async () => {
          listCalls += 1;
          return members;
        },
        fetch: async () => {
          throw new Error("Gateway member fetching must not be used.");
        },
      },
    } as unknown as Guild;
    const members = new Collection<string, GuildMember>([
      ["unregistered", member("unregistered", guild)],
      ["needs-evidence", member("needs-evidence", guild)],
      ["pending", member("pending", guild)],
      ["verified", member("verified", guild)],
      ["bot", member("bot", guild, true)],
    ]);
    const repository = {
      findByGuild: async () => [
        {
          memberDiscordId: "pending",
          lastReminderAt: new Date("2026-07-25T12:00:00.000Z"),
        },
      ],
    } as unknown as MemberOnboardingRepository;
    const players = {
      getByDiscordIds: async () => [
        player("needs-evidence", "pending"),
        player("pending", "pending"),
        player("verified", "verified"),
      ],
    } as Pick<PlayerService, "getByDiscordIds">;
    const verifications = {
      findPendingPlayerDiscordIds: async () => ["pending"],
    } as Pick<
      PlayerVerificationRepository,
      "findPendingPlayerDiscordIds"
    >;
    const service = new CommunityOnboardingService(
      repository,
      players,
      verifications,
      {} as ManagedCommunityChannelResolver,
      () => now,
    );

    assert.deepEqual(await service.getSnapshot(guild), {
      members: 4,
      registered: 3,
      verified: 1,
      unregistered: 1,
      verificationRequired: 1,
      awaitingOperationsReview: 1,
      reminderEligible: 2,
    });
    assert.deepEqual(await service.getSnapshot(guild), {
      members: 4,
      registered: 3,
      verified: 1,
      unregistered: 1,
      verificationRequired: 1,
      awaitingOperationsReview: 1,
      reminderEligible: 2,
    });
    assert.equal(listCalls, 1);
  });

  it("delivers a private welcome and records the attempt", async () => {
    const deliveries: unknown[] = [];
    const records: unknown[][] = [];
    const guild = { id: "guild-id" } as Guild;
    const repository = {
      recordReminder: async (...values: unknown[]) => {
        records.push(values);
      },
    } as unknown as MemberOnboardingRepository;
    const players = {
      getByDiscordIds: async () => [],
    } as Pick<PlayerService, "getByDiscordIds">;
    const verifications = {
      findPendingPlayerDiscordIds: async () => [],
    } as Pick<
      PlayerVerificationRepository,
      "findPendingPlayerDiscordIds"
    >;
    const channels = {
      resolveTextChannel: async () =>
        ({ id: "register-channel-id" }) as TextChannel,
    } as ManagedCommunityChannelResolver;
    const service = new CommunityOnboardingService(
      repository,
      players,
      verifications,
      channels,
      () => new Date("2026-07-26T12:00:00.000Z"),
    );
    const delivered = await service.welcome(
      member("member-id", guild, false, async (options) => {
        deliveries.push(options);
        return {};
      }),
    );

    assert.equal(delivered, true);
    assert.equal(deliveries.length, 1);
    assert.equal(records.length, 1);
    assert.deepEqual(records[0]?.slice(0, 2), ["guild-id", "member-id"]);
    assert.equal(records[0]?.[3], true);
  });

  it("declares unique member and reminder-due indexes", () => {
    const indexes = MemberOnboardingModel.schema.indexes();
    const unique = indexes.find(
      ([, options]) => options.name === "unique_member_onboarding",
    );
    const due = indexes.find(
      ([, options]) => options.name === "onboarding_reminder_due",
    );

    assert.equal(unique?.[1].unique, true);
    assert.ok(due);
  });

  it("lets Operations resolve reviews created by Vora Community", async () => {
    const requestId = "507f1f77bcf86cd799439011";
    let reviews = 0;
    let roleSynchronizations = 0;
    let edits = 0;
    const client = {
      playerVerification: {
        review: async () => {
          reviews += 1;
          return {
            id: requestId,
            status: "verified",
            playerDiscordId: "player-id",
            game: {
              ign: "Vora Player",
              playerId: "12345678",
              serverId: "9999",
            },
            reviewedByDiscordId: "operator-id",
            reviewedAt: new Date("2026-07-26T12:00:00.000Z"),
            rejectionReason: null,
          };
        },
      },
      guildAccess: {
        synchronizeVerifiedPlayerRole: async () => {
          roleSynchronizations += 1;
        },
      },
    } as unknown as CommunityClient;
    const interaction = {
      isButton: () => true,
      isModalSubmit: () => false,
      isChatInputCommand: () => false,
      customId: CustomIds.buttons.playerVerification.approve(requestId),
      inCachedGuild: () => true,
      memberPermissions: {
        has: (permission: bigint) =>
          permission === PermissionFlagsBits.ModerateMembers,
      },
      guildId: "guild-id",
      user: { id: "operator-id" },
      guild: {
        members: { fetch: async () => ({ id: "player-id" }) },
      },
      deferUpdate: async () => undefined,
      editReply: async () => {
        edits += 1;
      },
      followUp: async () => undefined,
    } as unknown as ButtonInteraction<"cached">;

    assert.equal(
      await handleCommunityOnboardingInteraction(client, interaction),
      true,
    );
    assert.equal(reviews, 1);
    assert.equal(roleSynchronizations, 1);
    assert.equal(edits, 1);
  });
});
