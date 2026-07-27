import { isValidObjectId } from "mongoose";

import { QueueActivationStateModel } from "../models/QueueActivationStateModel.js";
import {
  QueueSessionModel,
  type QueueSessionDocument,
} from "../models/QueueSessionModel.js";
import { QueueModel } from "../models/QueueModel.js";
import { SquadModel } from "../models/SquadModel.js";
import type {
  QueueActivationMetrics,
  QueueSessionSummary,
} from "../types/queueActivation.js";

function toSummary(session: QueueSessionDocument): QueueSessionSummary {
  return {
    id: session.id,
    title: session.title,
    startsAt: new Date(session.startsAt),
    endsAt: new Date(session.endsAt),
    status: session.status,
    notificationChannelId: session.notificationChannelId ?? null,
    notificationMessageId: session.notificationMessageId ?? null,
    notificationFinalizedAt: session.notificationFinalizedAt
      ? new Date(session.notificationFinalizedAt)
      : null,
  };
}

export class QueueActivationRepository {
  public async getQueueState(guildId: string) {
    return QueueActivationStateModel.findOne({ guildId }).exec();
  }

  public async observeQueue(
    guildId: string,
    queuedPlayers: number,
  ): Promise<void> {
    await QueueActivationStateModel.updateOne(
      { guildId },
      {
        $set: {
          lastObservedPlayers: queuedPlayers,
          ...(queuedPlayers === 0 ? { lastNotifiedMilestone: 0 } : {}),
        },
        $setOnInsert: {
          guildId,
          lastNotifiedAt: null,
          notificationChannelId: null,
          notificationMessageId: null,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    ).exec();
  }

  public async recordQueueNotification(
    guildId: string,
    queuedPlayers: number,
    milestone: number,
    notifiedAt: Date,
    channelId: string,
    messageId: string,
  ): Promise<void> {
    await QueueActivationStateModel.updateOne(
      { guildId },
      {
        $set: {
          lastObservedPlayers: queuedPlayers,
          lastNotifiedMilestone: milestone,
          lastNotifiedAt: notifiedAt,
          notificationChannelId: channelId,
          notificationMessageId: messageId,
        },
        $setOnInsert: { guildId },
      },
      { upsert: true, setDefaultsOnInsert: true },
    ).exec();
  }

  public async clearQueueNotification(guildId: string): Promise<void> {
    await QueueActivationStateModel.updateOne(
      { guildId },
      {
        $set: {
          notificationChannelId: null,
          notificationMessageId: null,
        },
      },
    ).exec();
  }

  public async getQueuedPlayerCount(guildId: string): Promise<number> {
    const queue = await QueueModel.findOne(
      { guildId },
      { entries: 1 },
    )
      .lean()
      .exec();

    return queue?.entries.length ?? 0;
  }

  public async createSession(input: {
    guildId: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    createdByDiscordId: string;
  }): Promise<QueueSessionSummary> {
    return toSummary(
      await QueueSessionModel.create({
        ...input,
        status: "scheduled",
        cancelledByDiscordId: null,
        cancelledAt: null,
        notificationClaimedAt: null,
        notifiedAt: null,
        notificationChannelId: null,
        notificationMessageId: null,
        notificationFinalizedAt: null,
        notificationDeletedAt: null,
      }),
    );
  }

  public async findUpcomingSessions(
    guildId: string,
    now: Date,
    limit: number,
  ): Promise<QueueSessionSummary[]> {
    const sessions = await QueueSessionModel.find({
      guildId,
      status: { $in: ["scheduled", "live"] },
      endsAt: { $gt: now },
    })
      .sort({ startsAt: 1 })
      .limit(limit)
      .exec();

    return sessions.map(toSummary);
  }

  public async cancelSession(
    guildId: string,
    sessionId: string,
    actorDiscordId: string,
    cancelledAt: Date,
  ): Promise<QueueSessionSummary | null> {
    if (!isValidObjectId(sessionId)) {
      return null;
    }

    const session = await QueueSessionModel.findOneAndUpdate(
      {
        _id: sessionId,
        guildId,
        status: "scheduled",
      },
      {
        $set: {
          status: "cancelled",
          cancelledByDiscordId: actorDiscordId,
          cancelledAt,
        },
      },
      { returnDocument: "after" },
    ).exec();

    return session ? toSummary(session) : null;
  }

  public async claimDueNotifications(
    guildId: string,
    dueAt: Date,
    claimedAt: Date,
    limit: number,
  ): Promise<QueueSessionSummary[]> {
    const candidates = await QueueSessionModel.find(
      {
        guildId,
        status: "scheduled",
        startsAt: { $lte: dueAt },
        notificationClaimedAt: null,
        notifiedAt: null,
      },
      { _id: 1 },
    )
      .sort({ startsAt: 1 })
      .limit(limit)
      .lean()
      .exec();
    const claimed: QueueSessionSummary[] = [];

    for (const candidate of candidates) {
      const session = await QueueSessionModel.findOneAndUpdate(
        {
          _id: candidate._id,
          status: "scheduled",
          notificationClaimedAt: null,
          notifiedAt: null,
        },
        { $set: { notificationClaimedAt: claimedAt } },
        { returnDocument: "after" },
      ).exec();

      if (session) {
        claimed.push(toSummary(session));
      }
    }

    return claimed;
  }

  public async finishNotification(
    sessionId: string,
    notifiedAt: Date,
    channelId: string,
    messageId: string,
  ): Promise<void> {
    await QueueSessionModel.updateOne(
      { _id: sessionId, notifiedAt: null },
      {
        $set: {
          notifiedAt,
          notificationChannelId: channelId,
          notificationMessageId: messageId,
        },
        $unset: { notificationClaimedAt: 1 },
      },
    ).exec();
  }

  public async releaseNotification(sessionId: string): Promise<void> {
    await QueueSessionModel.updateOne(
      { _id: sessionId, notifiedAt: null },
      { $set: { notificationClaimedAt: null } },
    ).exec();
  }

  public async advanceSessions(guildId: string, now: Date): Promise<void> {
    await Promise.all([
      QueueSessionModel.updateMany(
        {
          guildId,
          status: "scheduled",
          startsAt: { $lte: now },
          endsAt: { $gt: now },
        },
        { $set: { status: "live" } },
      ).exec(),
      QueueSessionModel.updateMany(
        {
          guildId,
          status: { $in: ["scheduled", "live"] },
          endsAt: { $lte: now },
        },
        { $set: { status: "completed" } },
      ).exec(),
    ]);
  }

  public async findNotificationsAwaitingFinalization(
    guildId: string,
    limit: number,
  ): Promise<QueueSessionSummary[]> {
    const sessions = await QueueSessionModel.find({
      guildId,
      status: { $in: ["cancelled", "completed"] },
      notificationMessageId: { $ne: null },
      notificationFinalizedAt: null,
    })
      .sort({ endsAt: 1 })
      .limit(limit)
      .exec();

    return sessions.map(toSummary);
  }

  public async recordNotificationFinalized(
    sessionId: string,
    finalizedAt: Date,
  ): Promise<void> {
    await QueueSessionModel.updateOne(
      { _id: sessionId, notificationFinalizedAt: null },
      { $set: { notificationFinalizedAt: finalizedAt } },
    ).exec();
  }

  public async findNotificationsAwaitingCleanup(
    guildId: string,
    finalizedBefore: Date,
    limit: number,
  ): Promise<QueueSessionSummary[]> {
    const sessions = await QueueSessionModel.find({
      guildId,
      notificationMessageId: { $ne: null },
      notificationFinalizedAt: { $lte: finalizedBefore },
      notificationDeletedAt: null,
    })
      .sort({ notificationFinalizedAt: 1 })
      .limit(limit)
      .exec();

    return sessions.map(toSummary);
  }

  public async recordNotificationDeleted(
    sessionId: string,
    deletedAt: Date,
  ): Promise<void> {
    await QueueSessionModel.updateOne(
      { _id: sessionId, notificationDeletedAt: null },
      {
        $set: {
          notificationChannelId: null,
          notificationMessageId: null,
          notificationDeletedAt: deletedAt,
        },
      },
    ).exec();
  }

  public async getMetrics(
    guildId: string,
    since: Date,
    alertSubscribers: number,
    windowDays: number,
  ): Promise<QueueActivationMetrics> {
    const [queuedPlayers, squads, sessionCounts] = await Promise.all([
      this.getQueuedPlayerCount(guildId),
      SquadModel.find(
        { guildId, createdAt: { $gte: since } },
        { status: 1, participants: 1, result: 1 },
      )
        .lean()
        .exec(),
      QueueSessionModel.aggregate<{ _id: string; count: number }>([
        { $match: { guildId, startsAt: { $gte: since } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]).exec(),
    ]);
    const uniquePlayers = new Set(
      squads.flatMap((squad) =>
        squad.participants.map((participant) => participant.discordId),
      ),
    );
    const sessions = new Map(
      sessionCounts.map((entry) => [entry._id, entry.count]),
    );

    return {
      windowDays,
      alertSubscribers,
      queuedPlayers,
      squadsFormed: squads.length,
      completedSquads: squads.filter(
        (squad) =>
          squad.status === "completed" &&
          squad.result?.verifiedAt !== null &&
          squad.result?.verifiedAt !== undefined,
      ).length,
      uniqueActivePlayers: uniquePlayers.size,
      scheduledSessions:
        (sessions.get("scheduled") ?? 0) + (sessions.get("live") ?? 0),
      completedSessions: sessions.get("completed") ?? 0,
    };
  }
}
