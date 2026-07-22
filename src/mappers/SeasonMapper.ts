import type { SeasonDto } from "../dto/SeasonDto.js";
import type { SeasonDocument } from "../models/SeasonModel.js";

export class SeasonMapper {
  public static toDto(season: SeasonDocument): SeasonDto {
    return {
      id: season.id,
      sequence: season.sequence,
      name: season.name,
      slug: season.slug,
      status: season.status,
      startsAt: new Date(season.startsAt),
      endsAt: new Date(season.endsAt),
      activatedAt: season.activatedAt ? new Date(season.activatedAt) : null,
      completedAt: season.completedAt ? new Date(season.completedAt) : null,
      createdByDiscordId: season.createdByDiscordId,
      activatedByDiscordId: season.activatedByDiscordId,
      completedByDiscordId: season.completedByDiscordId,
      rules: {
        baselineRsr: season.rules.baselineRsr,
        placementMatches: season.rules.placementMatches,
        softResetRetention: season.rules.softResetRetention,
      },
      createdAt: new Date(season.createdAt),
      updatedAt: new Date(season.updatedAt),
    };
  }
}
