import type { QueueSessionStatus } from "../constants/queueActivation.js";

export interface QueueActivationState {
  guildId: string;
  lastObservedPlayers: number;
  lastNotifiedMilestone: number;
  lastNotifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueSession {
  guildId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: QueueSessionStatus;
  createdByDiscordId: string;
  cancelledByDiscordId: string | null;
  cancelledAt: Date | null;
  notificationClaimedAt: Date | null;
  notifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueSessionSummary {
  readonly id: string;
  readonly title: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: QueueSessionStatus;
}

export interface QueueActivationMetrics {
  readonly windowDays: number;
  readonly alertSubscribers: number;
  readonly queuedPlayers: number;
  readonly squadsFormed: number;
  readonly completedSquads: number;
  readonly uniqueActivePlayers: number;
  readonly scheduledSessions: number;
  readonly completedSessions: number;
}
