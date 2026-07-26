import {
  OnboardingAudienceExclusionModel,
  type OnboardingAudienceExclusionDocument,
} from "../models/OnboardingAudienceExclusionModel.js";

export class OnboardingAudienceExclusionRepository {
  public async findActiveByGuild(
    guildId: string,
  ): Promise<OnboardingAudienceExclusionDocument[]> {
    return OnboardingAudienceExclusionModel.find({
      guildId,
      active: true,
    })
      .sort({ updatedAt: -1 })
      .exec();
  }

  public async isActive(
    guildId: string,
    memberDiscordId: string,
  ): Promise<boolean> {
    return OnboardingAudienceExclusionModel.exists({
      guildId,
      memberDiscordId,
      active: true,
    }).then((result) => result !== null);
  }

  public async excludeMany(
    guildId: string,
    memberDiscordIds: readonly string[],
    changedByDiscordId: string,
    reason: string,
    excludedAt: Date,
  ): Promise<number> {
    const uniqueIds = [...new Set(memberDiscordIds)];

    if (uniqueIds.length === 0) {
      return 0;
    }

    const result = await OnboardingAudienceExclusionModel.bulkWrite(
      uniqueIds.map((memberDiscordId) => ({
        updateOne: {
          filter: { guildId, memberDiscordId },
          update: {
            $set: {
              guildId,
              memberDiscordId,
              active: true,
              reason,
              changedByDiscordId,
              excludedAt,
              restoredAt: null,
            },
          },
          upsert: true,
        },
      })),
    );

    return result.upsertedCount + result.modifiedCount;
  }

  public async restore(
    guildId: string,
    memberDiscordId: string,
    changedByDiscordId: string,
    restoredAt: Date,
  ): Promise<boolean> {
    const result = await OnboardingAudienceExclusionModel.updateOne(
      { guildId, memberDiscordId, active: true },
      {
        $set: {
          active: false,
          changedByDiscordId,
          restoredAt,
        },
      },
      { runValidators: true },
    ).exec();

    return result.modifiedCount === 1;
  }
}
