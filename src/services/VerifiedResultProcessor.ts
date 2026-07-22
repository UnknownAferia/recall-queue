import type { SquadConfig } from "../constants/squad.js";
import type { SquadResult } from "../constants/squad.js";
import type { IntegritySanctionAction } from "../constants/integrity.js";
import type { TransactionRunner } from "../database/MongoTransactionRunner.js";
import type { ClientSession } from "mongoose";
import type { SquadDocument } from "../models/SquadModel.js";
import { RatingCalculator } from "../domain/rating/RatingCalculator.js";
import {
  calculateEffectiveIntegrityLevel,
  IntegritySanctionPolicy,
  type IntegritySanctionPenalty,
} from "../domain/integrity/IntegritySanctionPolicy.js";
import type { PlayerRepository } from "../repositories/PlayerRepository.js";
import type { SquadRepository } from "../repositories/SquadRepository.js";
import type { SquadIntegritySanction } from "../types/squad.js";
import type { ModerationAuditService } from "./ModerationAuditService.js";
import type { SeasonProgressionService } from "./SeasonProgressionService.js";

type ResultVerificationConfiguration = Pick<
  typeof SquadConfig,
  "resultConfirmationsRequired"
>;

export class VerifiedResultProcessor {
  public constructor(
    private readonly squadRepository: SquadRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly transactionRunner: TransactionRunner,
    private readonly config: ResultVerificationConfiguration,
    private readonly moderationAudit: ModerationAuditService | null = null,
    private readonly seasonProgression: SeasonProgressionService | null = null,
    private readonly ratingCalculator = new RatingCalculator(),
    private readonly integritySanctionPolicy = new IntegritySanctionPolicy(),
  ) {}

  public async process(squadId: string): Promise<SquadDocument | null> {
    return this.transactionRunner.run(async (session) => {
      const squad = await this.squadRepository.completeVerifiedResult(
        squadId,
        this.config.resultConfirmationsRequired,
        session,
      );

      if (!squad?.result) {
        return null;
      }

      return this.applyVerifiedResult(squad, session);
    });
  }

  public async processModerated(
    squadId: string,
    guildId: string,
    moderatorDiscordId: string,
    originalOutcome: SquadResult,
    finalOutcome: SquadResult,
    reportedByDiscordId: string,
    sanctionAction: IntegritySanctionAction,
  ): Promise<SquadDocument | null> {
    return this.transactionRunner.run(async (session) => {
      const sanction = await this.createSanctionAudit(
        reportedByDiscordId,
        sanctionAction,
        session,
      );
      const squad = await this.squadRepository.completeModeratedResult(
        squadId,
        guildId,
        moderatorDiscordId,
        originalOutcome,
        finalOutcome,
        reportedByDiscordId,
        sanction.audit,
        session,
      );

      if (!squad?.result) {
        return null;
      }

      const processedSquad = await this.applyVerifiedResult(
        squad,
        session,
        sanction.penalty ? reportedByDiscordId : null,
      );

      await this.applySanction(reportedByDiscordId, sanction.penalty, session);
      await this.moderationAudit?.recordDisputeResolution(
        processedSquad,
        session,
      );

      return processedSquad;
    });
  }

  public async processModeratedVoid(
    squadId: string,
    guildId: string,
    moderatorDiscordId: string,
    originalOutcome: SquadResult,
    reportedByDiscordId: string,
    sanctionAction: IntegritySanctionAction,
  ): Promise<SquadDocument | null> {
    return this.transactionRunner.run(async (session) => {
      const sanction = await this.createSanctionAudit(
        reportedByDiscordId,
        sanctionAction,
        session,
      );
      const squad = await this.squadRepository.voidDisputedResult(
        squadId,
        guildId,
        moderatorDiscordId,
        originalOutcome,
        reportedByDiscordId,
        sanction.audit,
        session,
      );

      if (!squad?.result) {
        return null;
      }

      await this.applySanction(reportedByDiscordId, sanction.penalty, session);
      await this.moderationAudit?.recordDisputeResolution(squad, session);

      return squad;
    });
  }

  private async applyVerifiedResult(
    squad: SquadDocument,
    session: ClientSession,
    behaviorRecoveryExcludedDiscordId: string | null = null,
  ): Promise<SquadDocument> {
    if (!squad.result) {
      throw new Error(`Squad ${squad.id} has no result to process.`);
    }

    const outcome = squad.result.outcome;

    const participantIds = squad.participants.map(
      (participant) => participant.discordId,
    );
    const players = await this.playerRepository.findByDiscordIds(
      participantIds,
      session,
    );

    if (players.length !== participantIds.length) {
      throw new Error(
        `Verified squad ${squad.id} could not load all ${participantIds.length} player profiles.`,
      );
    }

    const playersByDiscordId = new Map(
      players.map((player) => [player.discord.id, player]),
    );
    const ratingChanges = squad.participants.map((participant) => {
      const player = playersByDiscordId.get(participant.discordId);

      if (!player) {
        throw new Error(
          `Verified squad ${squad.id} is missing player ${participant.discordId}.`,
        );
      }

      return {
        discordId: participant.discordId,
        ...this.ratingCalculator.calculate({
          rsr: player.rating.rsr,
          confidence: player.rating.confidence,
          matchesPlayed: player.statistics.matchesPlayed,
          squadAverageRsr: squad.metrics.averageRsr,
          outcome,
        }),
      };
    });

    const update = await this.playerRepository.applyVerifiedSquadResult(
      ratingChanges,
      outcome,
      session,
    );

    if (
      update.matchedCount !== participantIds.length ||
      update.modifiedCount !== participantIds.length
    ) {
      throw new Error(
        `Verified squad ${squad.id} could not update all ${participantIds.length} player profiles.`,
      );
    }

    await this.seasonProgression?.recordVerifiedResult(
      players.map((player) => ({
        playerId: player._id,
        discordId: player.discord.id,
        ign: player.game.ign,
      })),
      ratingChanges,
      outcome,
      session,
    );

    const behaviorRecoveryIds = behaviorRecoveryExcludedDiscordId
      ? participantIds.filter(
          (discordId) => discordId !== behaviorRecoveryExcludedDiscordId,
        )
      : participantIds;

    await this.playerRepository.recoverBehaviorAfterVerifiedResult(
      behaviorRecoveryIds,
      session,
    );

    const auditedSquad = await this.squadRepository.storeRatingChanges(
      squad.id,
      ratingChanges,
      session,
    );

    if (!auditedSquad) {
      throw new Error(
        `Verified squad ${squad.id} could not store its rating audit.`,
      );
    }

    return auditedSquad;
  }

  private async createSanctionAudit(
    reportedByDiscordId: string,
    action: IntegritySanctionAction,
    session: ClientSession,
  ): Promise<{
    audit: SquadIntegritySanction;
    penalty: IntegritySanctionPenalty | null;
  }> {
    const player = await this.playerRepository.findByDiscordId(
      reportedByDiscordId,
      session,
    );

    if (!player) {
      throw new Error(
        `Dispute reporter ${reportedByDiscordId} has no player profile.`,
      );
    }

    const state = {
      level: player.behavior.integrityLevel ?? 0,
      lastSanctionAt: player.behavior.lastIntegritySanctionAt
        ? new Date(player.behavior.lastIntegritySanctionAt)
        : null,
    };

    if (action === "none") {
      const level = calculateEffectiveIntegrityLevel(state);

      return {
        audit: {
          action,
          targetDiscordId: reportedByDiscordId,
          behaviorScoreLoss: 0,
          integrityLevelBefore: level,
          integrityLevelAfter: level,
          bannedUntil: null,
        },
        penalty: null,
      };
    }

    const penalty = this.integritySanctionPolicy.createPenalty(action, state);

    return {
      audit: {
        action,
        targetDiscordId: reportedByDiscordId,
        behaviorScoreLoss: penalty.behaviorScoreLoss,
        integrityLevelBefore: penalty.levelBefore,
        integrityLevelAfter: penalty.levelAfter,
        bannedUntil: penalty.bannedUntil,
      },
      penalty,
    };
  }

  private async applySanction(
    reportedByDiscordId: string,
    penalty: IntegritySanctionPenalty | null,
    session: ClientSession,
  ): Promise<void> {
    if (!penalty) {
      return;
    }

    const applied = await this.playerRepository.applyIntegritySanction(
      reportedByDiscordId,
      penalty,
      session,
    );

    if (!applied) {
      throw new Error(
        `Integrity sanction could not be applied to ${reportedByDiscordId}.`,
      );
    }
  }
}
