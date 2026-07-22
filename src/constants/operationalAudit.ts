export const OperationalAuditEventTypes = [
  "ticket_opened",
  "ticket_closed",
  "ticket_transcript_archived",
  "ticket_channel_deleted",
  "ticket_record_purged",
  "ticket_rate_limited",
  "ticket_operation_failed",
] as const;

export type OperationalAuditEventType =
  (typeof OperationalAuditEventTypes)[number];
