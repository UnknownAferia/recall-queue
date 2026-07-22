import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ChannelType,
  Collection,
  type Guild,
  type TextChannel,
} from "discord.js";

import { GuildBlueprint } from "../src/config/guildBlueprint.js";
import { TicketOperationError } from "../src/community/errors/TicketOperationError.js";
import { FixedWindowRateLimiter } from "../src/community/services/FixedWindowRateLimiter.js";
import { ManagedCommunityChannelResolver } from "../src/community/services/ManagedCommunityChannelResolver.js";
import {
  serializeTicketTranscript,
  type TicketTranscriptMessage,
  type TicketTranscriptService,
} from "../src/community/services/TicketTranscriptService.js";
import { TicketService } from "../src/community/services/TicketService.js";
import { OperationalAuditModel } from "../src/models/OperationalAuditModel.js";
import {
  SupportTicketModel,
  type SupportTicketDocument,
} from "../src/models/SupportTicketModel.js";
import type { SupportTicketRepository } from "../src/repositories/SupportTicketRepository.js";
import type { OperationalAuditService } from "../src/services/OperationalAuditService.js";
import { respondWithError as respondWithCoreError } from "../src/handlers/registerInteractionHandler.js";

function hasIndex(
  indexes: ReturnType<typeof SupportTicketModel.schema.indexes>,
  name: string,
): boolean {
  return indexes.some(([, options]) => options.name === name);
}

function createClosedTicket(): SupportTicketDocument {
  return {
    id: "507f1f77bcf86cd799439011",
    guildId: "guild-id",
    channelId: "ticket-channel-id",
    requesterDiscordId: "requester-id",
    subject: "Result review",
    description: "Please review this squad result.",
    status: "closed",
    closedByDiscordId: "staff-id",
    createdAt: new Date("2026-07-20T10:00:00.000Z"),
    updatedAt: new Date("2026-07-20T11:00:00.000Z"),
    closedAt: new Date("2026-07-20T11:00:00.000Z"),
    transcriptChannelId: "archive-channel-id",
    transcriptMessageId: "archive-message-id",
    transcriptMessageCount: 2,
    transcriptArchivedAt: new Date("2026-07-20T11:00:01.000Z"),
    channelDeleteAfter: new Date("2026-07-27T11:00:00.000Z"),
    channelDeletedAt: null,
    transcriptDeleteAfter: new Date("2027-07-20T11:00:00.000Z"),
  } as SupportTicketDocument;
}

describe("Community launch safeguards", () => {
  it("does not crash Core when an interaction error response is unavailable", async () => {
    let deliveryAttempts = 0;
    const interaction = {
      id: "interaction-id",
      replied: true,
      deferred: false,
      isRepliable: () => true,
      followUp: async () => {
        deliveryAttempts += 1;
        throw new Error("Unknown Channel");
      },
    } as never;

    await assert.doesNotReject(respondWithCoreError(interaction));
    assert.equal(deliveryAttempts, 1);
  });

  it("enforces and resets fixed-window ticket rate limits", () => {
    const limiter = new FixedWindowRateLimiter();

    assert.equal(limiter.consume("ticket:user", 2, 1_000, 0).allowed, true);
    assert.equal(limiter.consume("ticket:user", 2, 1_000, 100).allowed, true);

    const blocked = limiter.consume("ticket:user", 2, 1_000, 200);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterMs, 800);
    assert.equal(limiter.consume("ticket:user", 2, 1_000, 1_000).allowed, true);
  });

  it("times out a stalled pre-creation dependency without creating a channel", async () => {
    let createdChannels = 0;
    const repository = {
      findOpenByRequester: async () =>
        new Promise<never>(() => {
          // Deliberately unresolved to simulate an unavailable dependency.
        }),
    } as unknown as SupportTicketRepository;
    const guild = {
      id: "guild-id",
      channels: {
        create: async () => {
          createdChannels += 1;
        },
      },
    } as unknown as Guild;
    const requester = {
      id: "requester-id",
    } as never;
    const service = new TicketService(
      repository,
      {} as ManagedCommunityChannelResolver,
      new FixedWindowRateLimiter(),
      { record: async () => undefined } as OperationalAuditService,
      {} as TicketTranscriptService,
      5,
    );

    await assert.rejects(
      service.open(
        guild,
        requester,
        "Support request",
        "This is a sufficiently detailed support request.",
      ),
      TicketOperationError,
    );
    assert.equal(createdChannels, 0);
  });

  it("resolves managed channels from the ready guild cache without REST fetches", async () => {
    const categoryBlueprint = GuildBlueprint.categories.find(
      (category) => category.key === "support",
    );
    const channelBlueprint = GuildBlueprint.channels.find(
      (channel) => channel.categoryKey === "support",
    );
    assert.ok(categoryBlueprint);
    assert.ok(channelBlueprint);

    let fetches = 0;
    const category = {
      id: "support-category-id",
      name: categoryBlueprint.name,
      type: ChannelType.GuildCategory,
    };
    const channel = {
      id: "support-channel-id",
      name: channelBlueprint.name,
      type: ChannelType.GuildText,
      parent: category,
    };
    const guild = {
      channels: {
        cache: new Collection([
          [category.id, category],
          [channel.id, channel],
        ]),
        fetch: async () => {
          fetches += 1;
          throw new Error("Managed resolver must not fetch a ready guild.");
        },
      },
    } as unknown as Guild;
    const resolver = new ManagedCommunityChannelResolver();

    const resolvedChannel = await resolver.resolveTextChannel(
      guild,
      channelBlueprint.key,
    );
    const resolvedCategoryId = await resolver.resolveCategoryId(
      guild,
      "support",
    );

    assert.equal(resolvedChannel?.id, channel.id);
    assert.equal(resolvedCategoryId, category.id);
    assert.equal(fetches, 0);
  });

  it("serializes ticket messages, identities and attachment references", () => {
    const ticket = createClosedTicket();
    const messages: TicketTranscriptMessage[] = [
      {
        id: "message-1",
        createdAt: new Date("2026-07-20T10:05:00.000Z"),
        authorTag: "player",
        authorId: "requester-id",
        content: "Here is the match result.",
        attachmentUrls: ["https://cdn.discordapp.com/result.png"],
      },
      {
        id: "message-2",
        createdAt: new Date("2026-07-20T10:06:00.000Z"),
        authorTag: "operator",
        authorId: "staff-id",
        content: "We are reviewing it.",
        attachmentUrls: [],
      },
    ];

    const transcript = serializeTicketTranscript(ticket, messages);

    assert.match(transcript, /Vora Support Ticket Transcript/);
    assert.match(transcript, /Result review/);
    assert.match(transcript, /player \(requester-id\)/);
    assert.match(transcript, /Here is the match result\./);
    assert.match(transcript, /https:\/\/cdn\.discordapp\.com\/result\.png/);
    assert.match(transcript, /operator \(staff-id\)/);
  });

  it("declares transcript retention and operational audit indexes", () => {
    const ticketIndexes = SupportTicketModel.schema.indexes();
    const auditIndexes = OperationalAuditModel.schema.indexes();

    assert.equal(hasIndex(ticketIndexes, "ticket_transcript_recovery"), true);
    assert.equal(hasIndex(ticketIndexes, "ticket_channel_retention"), true);
    assert.equal(hasIndex(ticketIndexes, "ticket_transcript_retention"), true);
    assert.equal(
      auditIndexes.some(
        ([, options]) => options.name === "guild_operational_audit_history",
      ),
      true,
    );
  });

  it("deletes only channels returned by the archived-ticket retention query", async () => {
    const ticket = createClosedTicket();
    let deletedChannels = 0;
    let markedDeleted = 0;
    const auditEvents: string[] = [];
    const repository = {
      findClosedWithoutTranscript: async () => [],
      findChannelsDueForDeletion: async () => [ticket],
      markChannelDeleted: async () => {
        markedDeleted += 1;
      },
      findTranscriptsDueForDeletion: async () => [],
    } as unknown as SupportTicketRepository;
    const audit = {
      record: async (event: { eventType: string }) => {
        auditEvents.push(event.eventType);
      },
    } as OperationalAuditService;
    const guild = {
      id: "guild-id",
      channels: {
        fetch: async () => ({
          delete: async () => {
            deletedChannels += 1;
          },
        }),
      },
    } as unknown as Guild;
    const service = new TicketService(
      repository,
      {} as ManagedCommunityChannelResolver,
      new FixedWindowRateLimiter(),
      audit,
      {} as TicketTranscriptService,
    );

    await service.runRetention(guild, new Date("2026-07-28T00:00:00.000Z"));

    assert.equal(deletedChannels, 1);
    assert.equal(markedDeleted, 1);
    assert.deepEqual(auditEvents, ["ticket_channel_deleted"]);
  });

  it("keeps a closed channel when transcript archival fails", async () => {
    const ticket = {
      ...createClosedTicket(),
      transcriptChannelId: null,
      transcriptMessageId: null,
      transcriptMessageCount: 0,
      transcriptArchivedAt: null,
    } as SupportTicketDocument;
    let deletedChannels = 0;
    let markedDeleted = 0;
    const repository = {
      findClosedWithoutTranscript: async () => [ticket],
      findChannelsDueForDeletion: async () => [],
      markChannelDeleted: async () => {
        markedDeleted += 1;
      },
      findTranscriptsDueForDeletion: async () => [],
    } as unknown as SupportTicketRepository;
    const channel = {
      type: 0,
      delete: async () => {
        deletedChannels += 1;
      },
    } as unknown as TextChannel;
    const guild = {
      id: "guild-id",
      channels: { fetch: async () => channel },
    } as unknown as Guild;
    const transcripts = {
      archive: async () => {
        throw new Error("Archive unavailable");
      },
    } as unknown as TicketTranscriptService;
    const audit = { record: async () => undefined } as OperationalAuditService;
    const service = new TicketService(
      repository,
      {} as ManagedCommunityChannelResolver,
      new FixedWindowRateLimiter(),
      audit,
      transcripts,
    );

    await service.runRetention(guild, new Date("2026-07-28T00:00:00.000Z"));

    assert.equal(deletedChannels, 0);
    assert.equal(markedDeleted, 0);
  });

  it("continues retention after one ticket operation fails", async () => {
    const failedTicket = {
      ...createClosedTicket(),
      id: "507f1f77bcf86cd799439012",
      channelId: "failed-channel-id",
    } as SupportTicketDocument;
    const healthyTicket = {
      ...createClosedTicket(),
      id: "507f1f77bcf86cd799439013",
      channelId: "healthy-channel-id",
    } as SupportTicketDocument;
    const markedTicketIds: string[] = [];
    const auditEvents: string[] = [];
    const repository = {
      findClosedWithoutTranscript: async () => [],
      findChannelsDueForDeletion: async () => [failedTicket, healthyTicket],
      markChannelDeleted: async (ticketId: string) => {
        markedTicketIds.push(ticketId);
      },
      findTranscriptsDueForDeletion: async () => [],
    } as unknown as SupportTicketRepository;
    const guild = {
      id: "guild-id",
      channels: {
        fetch: async (channelId: string) => ({
          delete: async () => {
            if (channelId === failedTicket.channelId) {
              throw new Error("Missing channel permission");
            }
          },
        }),
      },
    } as unknown as Guild;
    const audit = {
      record: async (event: { eventType: string }) => {
        auditEvents.push(event.eventType);
      },
    } as OperationalAuditService;
    const service = new TicketService(
      repository,
      {} as ManagedCommunityChannelResolver,
      new FixedWindowRateLimiter(),
      audit,
      {} as TicketTranscriptService,
    );

    await service.runRetention(guild, new Date("2026-07-28T00:00:00.000Z"));

    assert.deepEqual(markedTicketIds, [healthyTicket.id]);
    assert.deepEqual(auditEvents, [
      "ticket_operation_failed",
      "ticket_channel_deleted",
    ]);
  });
});
