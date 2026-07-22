export const OperationalAuditEventTypes = [
  "ticket_opened",
  "ticket_closed",
  "ticket_transcript_archived",
  "ticket_channel_deleted",
  "ticket_record_purged",
  "ticket_rate_limited",
  "ticket_operation_failed",
  "maintenance_changed",
  "system_recovery_run",
  "launch_audit_run",
  "critical_alert_published",
] as const;

export type OperationalAuditEventType =
  (typeof OperationalAuditEventTypes)[number];
