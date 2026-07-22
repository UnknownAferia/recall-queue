export const PlayerAdministrationActions = [
  "reset_verification",
  "unregister",
] as const;

export type PlayerAdministrationAction =
  (typeof PlayerAdministrationActions)[number];

export const PlayerAdministrationOperationStatuses = [
  "pending",
  "completed",
  "cancelled",
  "blocked",
  "expired",
] as const;

export type PlayerAdministrationOperationStatus =
  (typeof PlayerAdministrationOperationStatuses)[number];

export const PlayerAdministrationConfig = Object.freeze({
  confirmationLifetimeMs: 10 * 60 * 1_000,
  reasonMinimumLength: 10,
  reasonMaximumLength: 500,
});
