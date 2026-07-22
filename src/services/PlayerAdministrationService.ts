import type { ClientSession } from "mongoose";

import {
  PlayerAdministrationConfig,
  type PlayerAdministrationAction,
} from "../constants/playerAdministration.js";
import type { TransactionRunner } from "../database/MongoTransactionRunner.js";
import { PlayerMapper } from "../mappers/PlayerMapper.js";
import type { PlayerAdministrationRepository } from "../repositories/PlayerAdministrationRepository.js";
import type {
  PlayerAdministrationExecutionResult,
  PlayerAdministrationHistorySummary,
  PlayerAdministrationInspection,
  PlayerAdministrationOperation,
} from "../types/playerAdministration.js";
import { PlayerAdministrationError } from "./errors/PlayerAdministrationError.js";

export class PlayerAdministrationService {
  public constructor(
    private readonly repository: PlayerAdministrationRepository,
    private readonly transactionRunner: TransactionRunner,
  ) {}

  public async inspect(
    discordId: string,
    session?: ClientSession,
  ): Promise<PlayerAdministrationInspection> {
    const player = await this.repository.findPlayer(discordId, session);

    if (!player) {
      throw new PlayerAdministrationError(
        "No Vora player profile exists for this Discord account.",
      );
    }

    const history = await this.repository.getHistorySummary(discordId, session);
    const playerDto = PlayerMapper.toDto(player);
    const unregisterBlockers = this.resolveUnregisterBlockers(
      playerDto,
      history,
    );

    return {
      player: playerDto,
      history,
      unregisterBlockers,
      canUnregister: unregisterBlockers.length === 0,
    };
  }

  public async prepare(
    action: PlayerAdministrationAction,
    guildId: string,
    actorDiscordId: string,
    targetDiscordId: string,
    reason: string,
  ): Promise<{
    readonly operation: PlayerAdministrationOperation;
    readonly inspection: PlayerAdministrationInspection;
  }> {
    if (actorDiscordId === targetDiscordId) {
      throw new PlayerAdministrationError(
        "Staff members cannot perform player lifecycle actions on themselves.",
      );
    }

    const normalizedReason = reason.trim().replace(/\s+/g, " ");

    if (
      normalizedReason.length <
        PlayerAdministrationConfig.reasonMinimumLength ||
      normalizedReason.length >
        PlayerAdministrationConfig.reasonMaximumLength
    ) {
      throw new PlayerAdministrationError(
        "Provide a clear staff reason between 10 and 500 characters.",
      );
    }

    const inspection = await this.inspect(targetDiscordId);

    if (inspection.history.activeSquadId) {
      throw new PlayerAdministrationError(
        "This player is currently part of an active squad. Close that squad before changing the account lifecycle.",
      );
    }

    if (action === "unregister" && !inspection.canUnregister) {
      throw new PlayerAdministrationError(
        `This established profile cannot be deleted: ${inspection.unregisterBlockers.join(" ")}`,
      );
    }

    const operation = await this.repository.createOperation({
      action,
      guildId,
      actorDiscordId,
      targetDiscordId,
      reason: normalizedReason,
      expiresAt: new Date(
        Date.now() + PlayerAdministrationConfig.confirmationLifetimeMs,
      ),
    });

    return {
      operation: this.repository.toOperation(operation),
      inspection,
    };
  }

  public async cancel(
    operationId: string,
    guildId: string,
    actorDiscordId: string,
  ): Promise<PlayerAdministrationOperation> {
    const operation = await this.repository.findOwnedOperation(
      operationId,
      guildId,
      actorDiscordId,
    );

    if (!operation || operation.status !== "pending") {
      throw new PlayerAdministrationError(
        "This confirmation is no longer pending or belongs to another staff member.",
      );
    }

    const cancelled = await this.repository.transitionOperation(
      operationId,
      "pending",
      { status: "cancelled", completedAt: new Date() },
    );

    if (!cancelled) {
      throw new PlayerAdministrationError(
        "The operation changed before it could be cancelled.",
      );
    }

    return this.repository.toOperation(cancelled);
  }

  public async execute(
    operationId: string,
    guildId: string,
    actorDiscordId: string,
  ): Promise<PlayerAdministrationExecutionResult> {
    return this.transactionRunner.run(async (session) => {
      const operation = await this.repository.findOwnedOperation(
        operationId,
        guildId,
        actorDiscordId,
        session,
      );

      if (!operation || operation.status !== "pending") {
        throw new PlayerAdministrationError(
          "This confirmation is no longer pending or belongs to another staff member.",
        );
      }

      if (operation.expiresAt.getTime() <= Date.now()) {
        const expired = await this.repository.transitionOperation(
          operation.id,
          "pending",
          { status: "expired", completedAt: new Date() },
          session,
        );

        if (!expired) {
          throw new PlayerAdministrationError("The confirmation already changed.");
        }

        return { operation: this.repository.toOperation(expired), evidence: [] };
      }

      const inspection = await this.inspect(operation.targetDiscordId, session);
      const blockers =
        operation.action === "unregister"
          ? inspection.unregisterBlockers
          : inspection.history.activeSquadId
            ? ["The player entered an active squad before confirmation."]
            : [];

      if (blockers.length > 0) {
        const blocked = await this.repository.transitionOperation(
          operation.id,
          "pending",
          {
            status: "blocked",
            blockerReasons: blockers,
            completedAt: new Date(),
          },
          session,
        );

        if (!blocked) {
          throw new PlayerAdministrationError("The confirmation already changed.");
        }

        return { operation: this.repository.toOperation(blocked), evidence: [] };
      }

      const queuesRemoved = await this.repository.removeFromAllQueues(
        operation.targetDiscordId,
        session,
      );
      const evidence = await this.repository.closePendingVerifications(
        operation.targetDiscordId,
        actorDiscordId,
        operation.reason,
        session,
      );
      const playerDeleted =
        operation.action === "unregister"
          ? await this.repository.deleteUnusedPlayer(
              inspection.player.id,
              operation.targetDiscordId,
              session,
            )
          : false;

      if (
        operation.action === "reset_verification" &&
        !(await this.repository.resetVerification(
          operation.targetDiscordId,
          session,
        ))
      ) {
        throw new PlayerAdministrationError(
          "The player profile changed before verification could be reset.",
        );
      }

      if (operation.action === "unregister" && !playerDeleted) {
        throw new PlayerAdministrationError(
          "The player gained protected history before deletion. No data was removed.",
        );
      }

      const completed = await this.repository.transitionOperation(
        operation.id,
        "pending",
        {
          status: "completed",
          completedAt: new Date(),
          snapshot: {
            playerId: inspection.player.id,
            ign: inspection.player.game.ign,
            gamePlayerId: inspection.player.game.playerId,
            gameServerId: inspection.player.game.serverId,
            verificationStatus: inspection.player.verification.status,
            matchesPlayed: inspection.player.statistics.matchesPlayed,
            rsr: inspection.player.rating.rsr,
          },
          result: {
            queuesRemoved,
            verificationRequestsClosed: evidence.length,
            playerDeleted,
            managedRolesRemoved: 0,
            evidenceMessagesRemoved: 0,
          },
        },
        session,
      );

      if (!completed) {
        throw new PlayerAdministrationError(
          "The operation audit could not be finalized. No changes were committed.",
        );
      }

      return {
        operation: this.repository.toOperation(completed),
        evidence,
      };
    });
  }

  public async recordExternalCleanup(
    operationId: string,
    managedRolesRemoved: number,
    evidenceMessagesRemoved: number,
  ): Promise<void> {
    await this.repository.recordExternalCleanup(
      operationId,
      managedRolesRemoved,
      evidenceMessagesRemoved,
    );
  }

  private resolveUnregisterBlockers(
    player: PlayerAdministrationInspection["player"],
    history: PlayerAdministrationHistorySummary,
  ): string[] {
    return [
      history.activeSquadId
        ? `Active squad ${history.activeSquadId.slice(-8).toUpperCase()} must be closed.`
        : null,
      player.statistics.matchesPlayed > 0
        ? `${player.statistics.matchesPlayed} verified match(es) must remain attributable.`
        : null,
      history.competitiveSquads > 0
        ? `${history.competitiveSquads} completed or moderated squad record(s) exist.`
        : null,
      history.seasonMemberships > 0
        ? `${history.seasonMemberships} season membership record(s) exist.`
        : null,
      history.moderationRecords > 0
        ? `${history.moderationRecords} moderation or report record(s) exist.`
        : null,
      player.behavior.penalties > 0 ||
      player.behavior.integrityLevel > 0 ||
      player.queue.disciplineLevel > 0 ||
      player.queue.declinedMatches > 0
        ? "Discipline history exists on the player profile."
        : null,
    ].filter((entry): entry is string => entry !== null);
  }
}
