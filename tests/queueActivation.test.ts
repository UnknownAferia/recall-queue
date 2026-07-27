import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  Collection,
  type Guild,
  type GuildMember,
  type Role,
  type TextChannel,
} from "discord.js";

import { activationDashboardCommandData } from "../src/community/commands/activationDashboard.js";
import { queueSessionCommandData } from "../src/community/commands/queueSession.js";
import { QueueActivationError } from "../src/community/errors/QueueActivationError.js";
import { QueueActivationService } from "../src/community/services/QueueActivationService.js";
import {
  createActivationDashboardView,
  createUpcomingQueueSessionsView,
} from "../src/community/ui/createQueueActivationView.js";
import { createMatchmakingStatusView } from "../src/community/ui/createMatchmakingStatusView.js";
import { CommunityCustomIds } from "../src/constants/community.js";
import { GuildBlueprint } from "../src/config/guildBlueprint.js";
import { QueueActivationStateModel } from "../src/models/QueueActivationStateModel.js";
import { QueueSessionModel } from "../src/models/QueueSessionModel.js";
import type { QueueActivationRepository } from "../src/repositories/QueueActivationRepository.js";
import type { ManagedCommunityChannelResolver } from "../src/community/services/ManagedCommunityChannelResolver.js";

function roleWithSubscribers(count: number): Role {
  return {
    id: "squad-alert-role",
    name: "Squad Alerts",
    members: new Collection(
      Array.from({ length: count }, (_, index) => [
        `member-${index}`,
        { id: `member-${index}` },
      ]),
    ),
  } as unknown as Role;
}

function guildWithRole(role: Role): Guild {
  return {
    id: "guild-id",
    roles: {
      fetch: async () => new Collection([[role.id, role]]),
      cache: new Collection([[role.id, role]]),
    },
  } as unknown as Guild;
}

describe("Queue activation", () => {
  it("declares the managed opt-in role and persistent schedule indexes", () => {
    assert.equal(
      GuildBlueprint.roles.some(
        (role) => role.key === "squadAlerts" && role.name === "Squad Alerts",
      ),
      true,
    );
    assert.ok(
      QueueActivationStateModel.schema
        .indexes()
        .find(
          ([, options]) =>
            options.name === "unique_queue_activation_guild" &&
            options.unique === true,
        ),
    );
    assert.ok(
      QueueSessionModel.schema
        .indexes()
        .find(([, options]) => options.name === "queue_session_schedule"),
    );
    assert.ok(
      QueueSessionModel.schema
        .indexes()
        .find(
          ([, options]) =>
            options.name === "queue_session_notification_finalization",
        ),
    );
    assert.ok(
      QueueSessionModel.schema
        .indexes()
        .find(
          ([, options]) =>
            options.name === "queue_session_notification_cleanup",
        ),
    );
  });

  it("adds and removes the voluntary Squad Alerts role", async () => {
    const role = roleWithSubscribers(0);
    const guild = guildWithRole(role);
    let hasRole = false;
    const changes: string[] = [];
    const member = {
      roles: {
        cache: {
          has: () => hasRole,
        },
        add: async () => {
          hasRole = true;
          changes.push("added");
        },
        remove: async () => {
          hasRole = false;
          changes.push("removed");
        },
      },
    } as unknown as GuildMember;
    const service = new QueueActivationService(
      {} as QueueActivationRepository,
      {} as ManagedCommunityChannelResolver,
    );

    assert.equal(await service.toggleAlerts(guild, member), "enabled");
    assert.equal(await service.toggleAlerts(guild, member), "disabled");
    assert.deepEqual(changes, ["added", "removed"]);
  });

  it("publishes one milestone alert and respects the cooldown", async () => {
    const now = new Date("2026-07-26T18:00:00.000Z");
    const role = roleWithSubscribers(2);
    const guild = guildWithRole(role);
    const sent: unknown[] = [];
    let notifications = 0;
    let queueReads = 0;
    const repository = {
      getQueuedPlayerCount: async () => {
        queueReads += 1;
        return queueReads === 1 ? 3 : 4;
      },
      getQueueState: async () =>
        notifications === 0
          ? null
          : {
              lastNotifiedMilestone: 3,
              lastNotifiedAt: now,
            },
      observeQueue: async () => undefined,
      recordQueueNotification: async () => {
        notifications += 1;
      },
      findUpcomingSessions: async () => [],
      claimDueNotifications: async () => [],
      advanceSessions: async () => undefined,
      findNotificationsAwaitingFinalization: async () => [],
      findNotificationsAwaitingCleanup: async () => [],
    } as unknown as QueueActivationRepository;
    const channels = {
      resolveTextChannel: async () =>
        ({
          send: async (options: unknown) => {
            sent.push(options);
            return { id: "queue-message-id" };
          },
        }) as TextChannel,
    } as ManagedCommunityChannelResolver;
    const service = new QueueActivationService(
      repository,
      channels,
      () => now,
    );

    await service.tick(guild);
    await service.tick(guild);

    assert.equal(sent.length, 1);
    assert.equal(notifications, 1);
    assert.match(JSON.stringify(sent[0]), /2 More Players Needed/);
    assert.match(JSON.stringify(sent[0]), /squad-alert-role/);
  });

  it("delivers one scheduled-session reminder to opted-in players", async () => {
    const now = new Date("2026-07-26T18:00:00.000Z");
    const session = {
      id: "507f1f77bcf86cd799439011",
      title: "Friday Night Queue",
      startsAt: new Date("2026-07-26T18:20:00.000Z"),
      endsAt: new Date("2026-07-26T20:20:00.000Z"),
      status: "scheduled" as const,
    };
    const role = roleWithSubscribers(3);
    const guild = guildWithRole(role);
    const sent: unknown[] = [];
    const completed: string[] = [];
    const repository = {
      findUpcomingSessions: async () => [session],
      claimDueNotifications: async () => [session],
      finishNotification: async (sessionId: string) => {
        completed.push(sessionId);
      },
      releaseNotification: async () => undefined,
      advanceSessions: async () => undefined,
      getQueuedPlayerCount: async () => 0,
      getQueueState: async () => null,
      observeQueue: async () => undefined,
      findNotificationsAwaitingFinalization: async () => [],
      findNotificationsAwaitingCleanup: async () => [],
    } as unknown as QueueActivationRepository;
    const channels = {
      resolveTextChannel: async () =>
        ({
          send: async (options: unknown) => {
            sent.push(options);
            return { id: "session-message-id" };
          },
        }) as TextChannel,
    } as ManagedCommunityChannelResolver;
    const service = new QueueActivationService(
      repository,
      channels,
      () => now,
    );

    await service.tick(guild);

    assert.equal(sent.length, 1);
    assert.deepEqual(completed, [session.id]);
    assert.match(JSON.stringify(sent[0]), /Friday Night Queue/);
    assert.match(JSON.stringify(sent[0]), /squad-alert-role/);
  });

  it("updates one managed queue alert and removes it when the pool empties", async () => {
    const now = new Date("2026-07-26T18:00:00.000Z");
    const role = roleWithSubscribers(2);
    const guild = guildWithRole(role);
    const queueCounts = [1, 2, 0];
    const edits: unknown[] = [];
    let sends = 0;
    let deletes = 0;
    let state: {
      lastObservedPlayers: number;
      lastNotifiedMilestone: number;
      lastNotifiedAt: Date | null;
      notificationChannelId: string | null;
      notificationMessageId: string | null;
    } | null = null;
    const message = {
      id: "queue-message-id",
      edit: async (options: unknown) => {
        edits.push(options);
      },
      delete: async () => {
        deletes += 1;
      },
    };
    const repository = {
      getQueuedPlayerCount: async () => queueCounts.shift() ?? 0,
      getQueueState: async () => state,
      observeQueue: async (_guildId: string, queuedPlayers: number) => {
        if (state) {
          state.lastObservedPlayers = queuedPlayers;
          if (queuedPlayers === 0) {
            state.lastNotifiedMilestone = 0;
          }
        }
      },
      recordQueueNotification: async (
        _guildId: string,
        queuedPlayers: number,
        milestone: number,
        notifiedAt: Date,
        channelId: string,
        messageId: string,
      ) => {
        state = {
          lastObservedPlayers: queuedPlayers,
          lastNotifiedMilestone: milestone,
          lastNotifiedAt: notifiedAt,
          notificationChannelId: channelId,
          notificationMessageId: messageId,
        };
      },
      clearQueueNotification: async () => {
        if (state) {
          state.notificationChannelId = null;
          state.notificationMessageId = null;
        }
      },
      findUpcomingSessions: async () => [],
      claimDueNotifications: async () => [],
      advanceSessions: async () => undefined,
      findNotificationsAwaitingFinalization: async () => [],
      findNotificationsAwaitingCleanup: async () => [],
    } as unknown as QueueActivationRepository;
    const channels = {
      resolveTextChannel: async () =>
        ({
          id: "matchmaking-status-id",
          messages: {
            fetch: async () => message,
          },
          send: async () => {
            sends += 1;
            return message;
          },
        }) as unknown as TextChannel,
    } as ManagedCommunityChannelResolver;
    const service = new QueueActivationService(
      repository,
      channels,
      () => now,
    );

    await service.tick(guild);
    await service.tick(guild);
    await service.tick(guild);

    assert.equal(sends, 1);
    assert.equal(edits.length, 1);
    assert.match(JSON.stringify(edits[0]), /2\/5/);
    assert.equal(deletes, 1);
    assert.equal(state?.notificationMessageId, null);
  });

  it("finalizes and later removes completed session notifications", async () => {
    let now = new Date("2026-07-26T20:20:01.000Z");
    let finalizedAt: Date | null = null;
    let deletedAt: Date | null = null;
    const session = {
      id: "507f1f77bcf86cd799439011",
      title: "Friday Night Queue",
      startsAt: new Date("2026-07-26T18:20:00.000Z"),
      endsAt: new Date("2026-07-26T20:20:00.000Z"),
      status: "completed" as const,
      notificationChannelId: "matchmaking-status-id",
      notificationMessageId: "session-message-id",
      notificationFinalizedAt: null,
    };
    const role = roleWithSubscribers(0);
    const guild = guildWithRole(role);
    const edits: unknown[] = [];
    let deletes = 0;
    const message = {
      edit: async (options: unknown) => {
        edits.push(options);
      },
      delete: async () => {
        deletes += 1;
      },
    };
    const repository = {
      findUpcomingSessions: async () => [],
      claimDueNotifications: async () => [],
      advanceSessions: async () => undefined,
      findNotificationsAwaitingFinalization: async () =>
        finalizedAt || deletedAt ? [] : [session],
      findNotificationsAwaitingCleanup: async (
        _guildId: string,
        finalizedBefore: Date,
      ) =>
        finalizedAt && !deletedAt && finalizedAt <= finalizedBefore
          ? [{ ...session, notificationFinalizedAt: finalizedAt }]
          : [],
      recordNotificationFinalized: async (
        _sessionId: string,
        value: Date,
      ) => {
        finalizedAt = value;
      },
      recordNotificationDeleted: async (
        _sessionId: string,
        value: Date,
      ) => {
        deletedAt = value;
      },
      getQueuedPlayerCount: async () => 0,
      getQueueState: async () => null,
      observeQueue: async () => undefined,
    } as unknown as QueueActivationRepository;
    const channels = {
      resolveTextChannel: async () =>
        ({
          id: "matchmaking-status-id",
          messages: {
            fetch: async () => message,
          },
        }) as unknown as TextChannel,
    } as ManagedCommunityChannelResolver;
    const service = new QueueActivationService(
      repository,
      channels,
      () => now,
    );

    await service.tick(guild);
    now = new Date("2026-07-26T20:36:01.000Z");
    await service.tick(guild);

    assert.equal(edits.length, 1);
    assert.match(JSON.stringify(edits[0]), /SESSION COMPLETE/);
    assert.equal(deletes, 1);
    assert.ok(deletedAt);
  });

  it("validates, schedules and cancels persistent community sessions", async () => {
    const now = new Date("2026-07-26T18:00:00.000Z");
    const calls: unknown[][] = [];
    const repository = {
      createSession: async (input: {
        title: string;
        startsAt: Date;
        endsAt: Date;
      }) => {
        calls.push([input]);
        return {
          id: "507f1f77bcf86cd799439011",
          title: input.title,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          status: "scheduled" as const,
        };
      },
      cancelSession: async (...values: unknown[]) => {
        calls.push(values);
        return {
          id: "507f1f77bcf86cd799439011",
          title: "Friday Night Queue",
          startsAt: new Date("2026-07-26T19:00:00.000Z"),
          endsAt: new Date("2026-07-26T21:00:00.000Z"),
          status: "cancelled" as const,
        };
      },
    } as unknown as QueueActivationRepository;
    const service = new QueueActivationService(
      repository,
      {} as ManagedCommunityChannelResolver,
      () => now,
    );

    const session = await service.scheduleSession({
      guildId: "guild-id",
      title: " Friday   Night Queue ",
      startsInMinutes: 60,
      durationMinutes: 90,
      createdByDiscordId: "operator-id",
    });
    const cancelled = await service.cancelSession(
      "guild-id",
      session.id,
      "operator-id",
    );

    assert.equal(session.title, "Friday Night Queue");
    assert.equal(session.startsAt.toISOString(), "2026-07-26T19:00:00.000Z");
    assert.equal(session.endsAt.toISOString(), "2026-07-26T20:30:00.000Z");
    assert.equal(cancelled.status, "cancelled");
    await assert.rejects(
      service.scheduleSession({
        guildId: "guild-id",
        startsInMinutes: 1,
        createdByDiscordId: "operator-id",
      }),
      QueueActivationError,
    );
  });

  it("publishes controls, schedules and Operations activation metrics", () => {
    const session = {
      id: "507f1f77bcf86cd799439011",
      title: "Friday Night Queue",
      startsAt: new Date("2026-07-26T19:00:00.000Z"),
      endsAt: new Date("2026-07-26T21:00:00.000Z"),
      status: "scheduled" as const,
    };
    const status = JSON.stringify(
      createMatchmakingStatusView({
        guildId: "guild-id",
        coreOnline: true,
        coreHeartbeatAt: new Date("2026-07-26T18:00:00.000Z"),
        queueStatus: "open",
        registrationOpen: true,
        matchmakingOpen: true,
        maintenanceReason: null,
        queuedPlayers: 2,
        readyChecks: 0,
        activeSquads: 0,
        pendingResults: 0,
        disputedResults: 0,
        nextQueueSession: session,
        capturedAt: new Date("2026-07-26T18:00:00.000Z"),
      }).toJSON(),
    );
    const sessions = JSON.stringify(
      createUpcomingQueueSessionsView([session]).toJSON(),
    );
    const dashboard = JSON.stringify(
      createActivationDashboardView(
        {
          members: 21,
          excluded: 0,
          eligibleMembers: 21,
          registered: 7,
          verified: 4,
          unregistered: 14,
          verificationRequired: 1,
          awaitingOperationsReview: 2,
          reminderEligible: 14,
        },
        {
          windowDays: 7,
          alertSubscribers: 3,
          queuedPlayers: 2,
          squadsFormed: 2,
          completedSquads: 1,
          uniqueActivePlayers: 7,
          scheduledSessions: 1,
          completedSessions: 2,
        },
      ).toJSON(),
    );

    assert.match(
      status,
      new RegExp(CommunityCustomIds.queueActivation.toggleAlerts),
    );
    assert.match(status, /Friday Night Queue/);
    assert.match(sessions, /507f1f77bcf86cd799439011/);
    assert.match(dashboard, /Activation & Activity/);
    assert.match(dashboard, /Squad Alert subscribers/);
    assert.deepEqual(
      queueSessionCommandData.toJSON().options?.map((option) => option.name),
      ["schedule", "cancel", "list"],
    );
    assert.equal(
      activationDashboardCommandData.name,
      "activation-dashboard",
    );
  });
});
