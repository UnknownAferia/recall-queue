import type { SeasonStatus } from "../constants/season.js";

export interface SeasonRulesDto {
  readonly baselineRsr: number;
  readonly placementMatches: number;
  readonly softResetRetention: number;
}

export interface SeasonDto {
  readonly id: string;
  readonly sequence: number;
  readonly name: string;
  readonly slug: string;
  readonly status: SeasonStatus;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly activatedAt: Date | null;
  readonly completedAt: Date | null;
  readonly createdByDiscordId: string;
  readonly activatedByDiscordId: string | null;
  readonly completedByDiscordId: string | null;
  readonly rules: SeasonRulesDto;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
