import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Guild,
  type GuildMember,
  type TextChannel,
} from "discord.js";

import type { CommunityClient } from "../src/community/CommunityClient.js";
import {
  executePublishCommunityCommand,
  publishCommunityCommandData,
} from "../src/community/commands/publishCommunity.js";
import { registerCommunityInteractionHandler } from "../src/community/registerCommunityInteractionHandler.js";
import { CommunityCustomIds } from "../src/constants/community.js";
import { BrandAssets } from "../src/config/brand.js";
import type { PlayerDto } from "../src/dto/PlayerDto.js";
import { CommunityPanelModel } from "../src/models/CommunityPanelModel.js";
import { ServiceHeartbeatModel } from "../src/models/ServiceHeartbeatModel.js";
import {
  SupportTicketModel,
  type SupportTicketDocument,
} from "../src/models/SupportTicketModel.js";
import type { CommunityPanelRepository } from "../src/repositories/CommunityPanelRepository.js";
import type { ServiceHeartbeatRepository } from "../src/repositories/ServiceHeartbeatRepository.js";
import type { SupportTicketRepository } from "../src/repositories/SupportTicketRepository.js";
import { ServiceHeartbeatService } from "../src/services/ServiceHeartbeatService.js";
import { TicketOperationError } from "../src/community/errors/TicketOperationError.js";
import { CommunityPanelPublisher } from "../src/community/services/CommunityPanelPublisher.js";
import { CommunityPanelService } from "../src/community/services/CommunityPanelService.js";
import type { ManagedCommunityChannelResolver } from "../src/community/services/ManagedCommunityChannelResolver.js";
import { TicketService } from "../src/community/services/TicketService.js";
import { createAnnouncementsView } from "../src/community/ui/createAnnouncementsView.js";
import { createHelpView } from "../src/community/ui/createHelpView.js";
import { createHowVoraWorksView } from "../src/community/ui/createHowVoraWorksView.js";
import { createMatchmakingStatusView } from "../src/community/ui/createMatchmakingStatusView.js";
import { createPublicLeaderboardView } from "../src/community/ui/createPublicLeaderboardView.js";
import { createRulesView } from "../src/community/ui/createRulesView.js";
import { createTicketLauncherView } from "../src/community/ui/createTicketLauncherView.js";
import { createTicketModal } from "../src/community/ui/createTicketModal.js";
import { createVoraCommandsView } from "../src/community/ui/createVoraCommandsView.js";
import { createWelcomeView } from "../src/community/ui/createWelcomeView.js";
import type { CommunityPanelKind } from "../src/constants/community.js";
import type { CommunityDataRepository } from "../src/repositories/CommunityDataRepository.js";

function createPlayer(): PlayerDto {
  const now = new Date("2026-07-20T12:00:00.000Z");

  return {
    id: "player-document-id",
    discord: { id: "123456789012345678", username: "player" },
    game: { ign: "Vora Player", playerId: "12345678", serverId: "9999" },
    rating: { rsr: 1_250, confidence: 80 },
    statistics: { wins: 8, losses: 2, matchesPlayed: 10 },
    behavior: {
      score: 100,
      penalties: 0,
      integrityLevel: 0,
      lastIntegritySanctionAt: null,
    },
    queue: {
      acceptedMatches: 10,
      declinedMatches: 0,
      bannedUntil: null,
      disciplineLevel: 0,
      lastPenaltyAt: null,
    },
    preferences: {
      roles: { primary: "jungle", secondary: "mid", avoided: "roam" },
    },
    createdAt: now,
    updatedAt: now,
  };
}

function hasIndex(
  indexes: ReturnType<typeof CommunityPanelModel.schema.indexes>,
  name: string,
  unique = false,
): boolean {
  return indexes.some(
    ([, options]) =>
      options.name === name && Boolean(options.unique) === unique,
  );
}

describe("Vora Community bot", () => {
  it("serializes public automation and onboarding panels", () => {
    const now = new Date("2026-07-20T12:00:00.000Z");
    const leaderboard = JSON.stringify(
      createPublicLeaderboardView([createPlayer()], now).toJSON(),
    );
    const status = JSON.stringify(
      createMatchmakingStatusView({
        guildId: "guild-id",
        coreOnline: true,
        coreHeartbeatAt: now,
        queueStatus: "open",
        queuedPlayers: 4,
        readyChecks: 1,
        activeSquads: 2,
        pendingResults: 1,
        disputedResults: 0,
        capturedAt: now,
      }).toJSON(),
    );
    const help = JSON.stringify(createHelpView().toJSON());
    const ticket = JSON.stringify(createTicketLauncherView().toJSON());
    const onboarding = [
      createWelcomeView(BrandAssets.banner.attachmentName),
      createRulesView(),
      createAnnouncementsView(),
      createHowVoraWorksView(),
      createVoraCommandsView(),
    ]
      .map((view) => JSON.stringify(view.toJSON()))
      .join("\n");

    assert.match(leaderboard, /Global Leaderboard/);
    assert.match(leaderboard, /1,250 RSR/);
    assert.match(status, /Matchmaking Operational/);
    assert.match(status, /Waiting players/);
    assert.match(help, /Help Center/);
    assert.match(help, new RegExp(CommunityCustomIds.ticket.open));
    assert.match(ticket, /Open a Ticket/);
    assert.match(onboarding, /Find Better Teammates/);
    assert.match(onboarding, /Vora Rules/);
    assert.match(onboarding, /Vora Announcements/);
    assert.match(onboarding, /How Vora Works/);
    assert.match(onboarding, /Competitive Hub/);
    assert.match(onboarding, /attachment:\/\/Vora_Banner\.png/);
  });

  it("publishes every managed static panel and reports missing channels", async () => {
    const published: CommunityPanelKind[] = [];
    const publisher = {
      publish: async (_channel: TextChannel, kind: CommunityPanelKind) => {
        published.push(kind);
        return "message-id";
      },
    } as unknown as CommunityPanelPublisher;
    const channels = {
      resolveTextChannel: async (_guild: Guild, channelKey: string) =>
        channelKey === "announcements"
          ? null
          : ({ id: channelKey } as TextChannel),
    } as ManagedCommunityChannelResolver;
    const service = new CommunityPanelService(
      {} as CommunityDataRepository,
      publisher,
      channels,
    );

    const result = await service.synchronizeStaticPanels({} as Guild);

    assert.equal(result.published.length, 6);
    assert.deepEqual(result.missingChannelKeys, ["announcements"]);
    assert.equal(published.includes("welcome"), true);
    assert.equal(published.includes("ticket_launcher"), true);
  });

  it("publishes community content through an administrator-only command", async () => {
    const replies: unknown[] = [];
    const edits: unknown[] = [];
    let synchronizations = 0;
    const client = {
      panels: {
        synchronizeStaticPanels: async () => {
          synchronizations += 1;
          return {
            published: ["welcome", "rules"],
            missingChannelKeys: [],
          };
        },
      },
    } as unknown as CommunityClient;
    const interaction = {
      inCachedGuild: () => true,
      guild: {},
      memberPermissions: {
        has: (permission: bigint) =>
          permission === PermissionFlagsBits.Administrator,
      },
      reply: async (options: unknown) => {
        replies.push(options);
      },
      editReply: async (options: unknown) => {
        edits.push(options);
      },
    } as unknown as ChatInputCommandInteraction;

    await executePublishCommunityCommand(client, interaction);

    assert.equal(publishCommunityCommandData.name, "publish-community");
    assert.equal(synchronizations, 1);
    assert.equal(replies.length, 1);
    assert.equal(edits.length, 1);
    assert.ok(
      (replies[0] as { flags: number }).flags & MessageFlags.IsComponentsV2,
    );
    assert.match(JSON.stringify(edits[0]), /Community Content Published/);
  });

  it("shows an unavailable state when the Core heartbeat is stale", () => {
    const view = JSON.stringify(
      createMatchmakingStatusView({
        guildId: "guild-id",
        coreOnline: false,
        coreHeartbeatAt: new Date("2026-07-20T11:00:00.000Z"),
        queueStatus: "open",
        queuedPlayers: 0,
        readyChecks: 0,
        activeSquads: 0,
        pendingResults: 0,
        disputedResults: 0,
        capturedAt: new Date("2026-07-20T12:00:00.000Z"),
      }).toJSON(),
    );

    assert.match(view, /Core Service Unavailable/);
    assert.match(view, /Do not join matchmaking/);
  });

  it("declares unique panel, heartbeat and open-ticket indexes", () => {
    assert.equal(
      hasIndex(
        CommunityPanelModel.schema.indexes(),
        "unique_community_panel",
        true,
      ),
      true,
    );
    assert.equal(
      hasIndex(
        ServiceHeartbeatModel.schema.indexes(),
        "unique_service_heartbeat",
        true,
      ),
      true,
    );

    const ticketIndex = SupportTicketModel.schema
      .indexes()
      .find(
        ([, options]) => options.name === "unique_open_ticket_per_requester",
      );

    assert.equal(ticketIndex?.[1].unique, true);
    assert.deepEqual(ticketIndex?.[1].partialFilterExpression, {
      status: "open",
    });
  });

  it("edits the persisted panel message instead of creating duplicates", async () => {
    let editCount = 0;
    let sendCount = 0;
    const repository = {
      find: async () => ({ channelId: "channel-id", messageId: "message-id" }),
      upsert: async () => {
        throw new Error("Existing panels must not be inserted again.");
      },
    } as unknown as CommunityPanelRepository;
    const channel = {
      id: "channel-id",
      guild: { id: "guild-id" },
      messages: {
        fetch: async () => ({
          id: "message-id",
          edit: async () => {
            editCount += 1;
          },
        }),
      },
      send: async () => {
        sendCount += 1;
        return { id: "unexpected" };
      },
    } as unknown as TextChannel;
    const publisher = new CommunityPanelPublisher(repository);

    const messageId = await publisher.publish(
      channel,
      "help",
      createHelpView(),
    );

    assert.equal(messageId, "message-id");
    assert.equal(editCount, 1);
    assert.equal(sendCount, 0);
  });

  it("uploads a missing panel asset and reuses an existing attachment", async () => {
    const editedFiles: unknown[][] = [];
    let assetPresent = false;
    const repository = {
      find: async () => ({ channelId: "channel-id", messageId: "message-id" }),
    } as unknown as CommunityPanelRepository;
    const channel = {
      id: "channel-id",
      guild: { id: "guild-id" },
      messages: {
        fetch: async () => ({
          id: "message-id",
          attachments: {
            some: () => assetPresent,
          },
          edit: async (options: { files?: unknown[] }) => {
            editedFiles.push(options.files ?? []);
          },
        }),
      },
    } as unknown as TextChannel;
    const publisher = new CommunityPanelPublisher(repository);
    const view = createWelcomeView(BrandAssets.banner.attachmentName);

    await publisher.publish(channel, "welcome", view, BrandAssets.banner);
    assetPresent = true;
    await publisher.publish(channel, "welcome", view, BrandAssets.banner);

    assert.equal(editedFiles[0]?.length, 1);
    assert.equal(editedFiles[1]?.length, 0);
  });

  it("updates and stops the independent service heartbeat", async () => {
    let touches = 0;
    const repository = {
      touch: async () => {
        touches += 1;
        return {};
      },
    } as unknown as ServiceHeartbeatRepository;
    const heartbeat = new ServiceHeartbeatService("community", repository);

    await heartbeat.start();
    heartbeat.stop();

    assert.equal(touches, 1);
  });

  it("validates ticket content before creating Discord resources", async () => {
    const tickets = new TicketService(
      {} as SupportTicketRepository,
      {} as ManagedCommunityChannelResolver,
    );

    await assert.rejects(
      tickets.open(
        {} as Guild,
        {} as GuildMember,
        "x",
        "This description is long enough.",
      ),
      TicketOperationError,
    );
  });

  it("allows only the requester or staff to close a ticket", async () => {
    const ticket = {
      id: "ticket-id",
      requesterDiscordId: "requester-id",
    } as SupportTicketDocument;
    const repository = {
      findOpenByChannel: async () => ticket,
    } as unknown as SupportTicketRepository;
    const tickets = new TicketService(
      repository,
      {} as ManagedCommunityChannelResolver,
    );
    const member = {
      id: "outsider-id",
      permissions: { has: () => false },
    } as unknown as GuildMember;

    await assert.rejects(
      tickets.close(
        { id: "guild-id" } as Guild,
        { id: "channel-id" } as TextChannel,
        member,
      ),
      /Only the ticket requester or Vora staff/,
    );
  });

  it("uses stable ticket modal component IDs", () => {
    const modal = JSON.stringify(createTicketModal().toJSON());

    assert.match(modal, new RegExp(CommunityCustomIds.ticket.create));
    assert.match(modal, new RegExp(CommunityCustomIds.ticket.subject));
    assert.match(modal, new RegExp(CommunityCustomIds.ticket.description));
  });

  it("starts ticket creation with a Components V2 reply", async () => {
    let interactionListener:
      ((interaction: unknown) => Promise<void>) | undefined;
    const replies: unknown[] = [];
    const edits: unknown[] = [];
    let replied = false;

    const client = {
      on: (
        _event: string,
        listener: (interaction: unknown) => Promise<void>,
      ) => {
        interactionListener = listener;
      },
      tickets: {
        open: async () => ({ channel: { id: "ticket-channel-id" } }),
      },
    } as unknown as CommunityClient;

    registerCommunityInteractionHandler(client);
    assert.ok(interactionListener);

    const interaction = {
      id: "interaction-id",
      customId: CommunityCustomIds.ticket.create,
      deferred: false,
      get replied() {
        return replied;
      },
      isChatInputCommand: () => false,
      isButton: () => false,
      isModalSubmit: () => true,
      isRepliable: () => true,
      inCachedGuild: () => true,
      guild: {},
      member: {},
      fields: {
        getTextInputValue: (customId: string) =>
          customId === CommunityCustomIds.ticket.subject
            ? "Match result dispute"
            : "The submitted result requires staff review.",
      },
      reply: async (options: unknown) => {
        replies.push(options);
        replied = true;
      },
      editReply: async (options: unknown) => {
        edits.push(options);
      },
    };

    await interactionListener(interaction);

    assert.equal(replies.length, 1);
    assert.equal(edits.length, 1);

    const initialReply = replies[0] as {
      flags: number;
      components: unknown[];
    };
    assert.ok(initialReply.flags & MessageFlags.IsComponentsV2);
    assert.match(JSON.stringify(initialReply.components), /Creating Ticket/);
    assert.match(JSON.stringify(edits[0]), /Ticket Opened/);
  });
});
