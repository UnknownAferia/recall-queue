import {
  MemberOnboardingModel,
  type MemberOnboardingDocument,
} from "../models/MemberOnboardingModel.js";

export class MemberOnboardingRepository {
  public async findByGuild(
    guildId: string,
  ): Promise<MemberOnboardingDocument[]> {
    return MemberOnboardingModel.find({ guildId }).exec();
  }

  public async recordReminder(
    guildId: string,
    memberDiscordId: string,
    sentAt: Date,
    succeeded: boolean,
    failureReason: string | null,
  ): Promise<void> {
    await MemberOnboardingModel.updateOne(
      { guildId, memberDiscordId },
      {
        $set: {
          guildId,
          memberDiscordId,
          lastReminderAt: sentAt,
          lastDeliverySucceeded: succeeded,
          lastFailureReason: failureReason,
        },
        $inc: { reminderCount: 1 },
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).exec();
  }
}
