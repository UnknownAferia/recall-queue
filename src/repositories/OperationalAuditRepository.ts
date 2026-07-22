import type { OperationalAuditEventType } from "../constants/operationalAudit.js";
import {
  OperationalAuditModel,
  type OperationalAuditDocument,
} from "../models/OperationalAuditModel.js";
import type { OperationalAuditDetails } from "../types/community.js";

export interface CreateOperationalAuditInput {
  readonly eventType: OperationalAuditEventType;
  readonly guildId: string;
  readonly actorDiscordId: string | null;
  readonly subjectType: "support_ticket" | "community_service";
  readonly subjectId: string;
  readonly details?: OperationalAuditDetails;
  readonly occurredAt?: Date;
}

export class OperationalAuditRepository {
  public async create(
    input: CreateOperationalAuditInput,
  ): Promise<OperationalAuditDocument> {
    return OperationalAuditModel.create({
      schemaVersion: 1,
      ...input,
      details: input.details ?? {},
      occurredAt: input.occurredAt ?? new Date(),
    });
  }
}
