export const SquadStatuses = [
  "ready_check",
  "active",
  "result_pending",
  "disputed",
  "completed",
  "cancelled",
] as const;

export type SquadStatus = (typeof SquadStatuses)[number];

export const ReadyCheckStatuses = ["pending", "accepted", "declined"] as const;

export type ReadyCheckStatus = (typeof ReadyCheckStatuses)[number];

export const SquadResults = ["win", "loss"] as const;

export type SquadResult = (typeof SquadResults)[number];

export const SquadModerationDecisions = [
  "upheld",
  "overridden",
  "voided",
] as const;

export type SquadModerationDecision =
  (typeof SquadModerationDecisions)[number];

export const SquadConfig = Object.freeze({
  readyCheckDurationMs: 30_000,
  expirationSweepIntervalMs: 5_000,
  expirationBatchSize: 100,
  readyCheckViewUpdateGraceMs: 100,
  resultConfirmationsRequired: 3,
  historyLimit: 10,
});
