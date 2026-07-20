import type { ClientSession } from "mongoose";

import {
  ModerationAuditModel,
  type ModerationAuditDocument,
} from "../models/ModerationAuditModel.js";
import type { CreateModerationAuditEventInput } from "../types/moderationAudit.js";

export class ModerationAuditRepository {
  public async create(
    input: CreateModerationAuditEventInput,
    session: ClientSession,
  ): Promise<ModerationAuditDocument> {
    const [event] = await ModerationAuditModel.create([input], { session });

    if (!event) {
      throw new Error("MongoDB did not return the moderation audit event.");
    }

    return event;
  }

  public async findRecentByGuild(
    guildId: string,
    targetDiscordId: string | undefined,
    limit: number,
  ): Promise<ModerationAuditDocument[]> {
    return ModerationAuditModel.find({
      guildId,
      ...(targetDiscordId ? { targetDiscordId } : {}),
    })
      .sort({ occurredAt: -1, _id: -1 })
      .limit(limit)
      .exec();
  }
}
