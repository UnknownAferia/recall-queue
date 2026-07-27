export const QueueSessionStatuses = [
  "scheduled",
  "live",
  "cancelled",
  "completed",
] as const;

export type QueueSessionStatus = (typeof QueueSessionStatuses)[number];

export const QueueActivationConfig = Object.freeze({
  notificationCooldownMs: 30 * 60 * 1_000,
  notificationMilestones: [1, 3, 4] as const,
  sessionReminderLeadMs: 30 * 60 * 1_000,
  minimumSessionLeadMinutes: 5,
  maximumSessionLeadMinutes: 7 * 24 * 60,
  defaultSessionDurationMinutes: 120,
  minimumSessionDurationMinutes: 30,
  maximumSessionDurationMinutes: 360,
  maximumUpcomingSessions: 10,
  notificationCleanupDelayMs: 15 * 60 * 1_000,
  activityWindowDays: 7,
});
