export const ModerationAuditEventTypes = ["dispute_resolved"] as const;

export type ModerationAuditEventType =
  (typeof ModerationAuditEventTypes)[number];

export const ModerationAuditConfig = Object.freeze({
  schemaVersion: 1,
  recentEventLimit: 8,
});
