import { SeasonConfig } from "../constants/season.js";
import type { TransactionRunner } from "../database/MongoTransactionRunner.js";
import type { SeasonControlStateDto, SeasonDto } from "../dto/SeasonDto.js";
import { SeasonMapper } from "../mappers/SeasonMapper.js";
import type { SeasonRepository } from "../repositories/SeasonRepository.js";
import type { CreateSeasonInput, SeasonRules } from "../types/season.js";
import { InvalidSeasonDataError } from "./errors/InvalidSeasonDataError.js";
import { SeasonLifecycleError } from "./errors/SeasonLifecycleError.js";

export class SeasonService {
  public constructor(
    private readonly seasonRepository: SeasonRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  public async createScheduled(input: CreateSeasonInput): Promise<SeasonDto> {
    const normalized = this.normalizeCreateInput(input);

    try {
      const season = await this.seasonRepository.createScheduled(normalized);

      return SeasonMapper.toDto(season);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        throw new SeasonLifecycleError(
          "A season with this sequence or slug already exists.",
        );
      }

      throw error;
    }
  }

  public async getActive(): Promise<SeasonDto | null> {
    const season = await this.seasonRepository.findActive();

    return season ? SeasonMapper.toDto(season) : null;
  }

  public async getControlState(): Promise<SeasonControlStateDto> {
    const [active, scheduled, recentlyCompleted] = await Promise.all([
      this.seasonRepository.findActive(),
      this.seasonRepository.findScheduled(5),
      this.seasonRepository.findRecentlyCompleted(3),
    ]);

    return {
      active: active ? SeasonMapper.toDto(active) : null,
      scheduled: scheduled.map((season) => SeasonMapper.toDto(season)),
      recentlyCompleted: recentlyCompleted.map((season) =>
        SeasonMapper.toDto(season),
      ),
    };
  }

  public async activate(
    seasonId: string,
    actorDiscordId: string,
    now = new Date(),
  ): Promise<SeasonDto> {
    this.validateActor(actorDiscordId);

    const candidate = await this.seasonRepository.findById(seasonId);

    if (!candidate) {
      throw new SeasonLifecycleError("The selected season does not exist.");
    }

    if (candidate.status !== "scheduled") {
      throw new SeasonLifecycleError(
        "Only a scheduled season can be activated.",
      );
    }

    if (now < candidate.startsAt || now >= candidate.endsAt) {
      throw new SeasonLifecycleError(
        "A season can only be activated within its configured date range.",
      );
    }

    const active = await this.seasonRepository.findActive();

    if (active) {
      throw new SeasonLifecycleError(
        `Season ${active.name} is already active. Complete it first.`,
      );
    }

    try {
      const activated = await this.seasonRepository.activateScheduled(
        seasonId,
        actorDiscordId.trim(),
        now,
      );

      if (!activated) {
        throw new SeasonLifecycleError(
          "The season changed while it was being activated. Refresh and try again.",
        );
      }

      return SeasonMapper.toDto(activated);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        throw new SeasonLifecycleError(
          "Another season became active at the same time.",
        );
      }

      throw error;
    }
  }

  public async complete(
    seasonId: string,
    actorDiscordId: string,
    now = new Date(),
  ): Promise<SeasonDto> {
    this.validateActor(actorDiscordId);

    return this.transactionRunner.run(async (session) => {
      const completed = await this.seasonRepository.completeActive(
        seasonId,
        actorDiscordId.trim(),
        now,
        session,
      );

      if (!completed) {
        throw new SeasonLifecycleError(
          "Only the currently active season can be completed.",
        );
      }

      await this.seasonRepository.finalizeMemberships(completed._id, session);

      return SeasonMapper.toDto(completed);
    });
  }

  private normalizeCreateInput(
    input: CreateSeasonInput,
  ): CreateSeasonInput & { rules: SeasonRules } {
    const name = input.name.trim().replace(/\s+/g, " ");
    const slug = input.slug.trim().toLowerCase();
    const createdByDiscordId = input.createdByDiscordId.trim();
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const rules: SeasonRules = {
      baselineRsr: input.rules?.baselineRsr ?? SeasonConfig.baselineRsr,
      placementMatches:
        input.rules?.placementMatches ?? SeasonConfig.placementMatches,
      softResetRetention:
        input.rules?.softResetRetention ?? SeasonConfig.softResetRetention,
    };

    if (!Number.isInteger(input.sequence) || input.sequence < 1) {
      throw new InvalidSeasonDataError(
        "The season sequence must be a positive integer.",
      );
    }

    if (name.length < 3 || name.length > 64) {
      throw new InvalidSeasonDataError(
        "The season name must contain between 3 and 64 characters.",
      );
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new InvalidSeasonDataError(
        "The season slug may only contain lowercase letters, numbers and single hyphens.",
      );
    }

    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime()) ||
      endsAt <= startsAt
    ) {
      throw new InvalidSeasonDataError(
        "The season end date must be later than its start date.",
      );
    }

    this.validateActor(createdByDiscordId);
    this.validateRules(rules);

    return {
      sequence: input.sequence,
      name,
      slug,
      startsAt,
      endsAt,
      createdByDiscordId,
      rules,
    };
  }

  private validateRules(rules: SeasonRules): void {
    if (!Number.isFinite(rules.baselineRsr) || rules.baselineRsr < 0) {
      throw new InvalidSeasonDataError(
        "The season baseline RSR must be zero or greater.",
      );
    }

    if (
      !Number.isInteger(rules.placementMatches) ||
      rules.placementMatches < 0
    ) {
      throw new InvalidSeasonDataError(
        "Placement matches must be a non-negative integer.",
      );
    }

    if (
      !Number.isFinite(rules.softResetRetention) ||
      rules.softResetRetention < 0 ||
      rules.softResetRetention > 1
    ) {
      throw new InvalidSeasonDataError(
        "Soft-reset retention must be between zero and one.",
      );
    }
  }

  private validateActor(actorDiscordId: string): void {
    if (!actorDiscordId.trim()) {
      throw new InvalidSeasonDataError(
        "A Discord account is required for season administration.",
      );
    }
  }
}
