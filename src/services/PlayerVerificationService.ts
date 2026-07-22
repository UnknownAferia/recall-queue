import { Types, type ClientSession } from "mongoose";
import type { Attachment, Guild } from "discord.js";

import type { TransactionRunner } from "../database/MongoTransactionRunner.js";
import {
  isPlayerVerificationApproved,
  normalizePlayerVerificationStatus,
  PlayerVerificationConfig,
  type PlayerVerificationDecision,
} from "../constants/playerVerification.js";
import type { PlayerVerificationDto } from "../dto/PlayerVerificationDto.js";
import { PlayerMapper } from "../mappers/PlayerMapper.js";
import { PlayerVerificationMapper } from "../mappers/PlayerVerificationMapper.js";
import type { PlayerRepository } from "../repositories/PlayerRepository.js";
import type { PlayerVerificationRepository } from "../repositories/PlayerVerificationRepository.js";
import { PlayerProfileNotFoundError } from "./errors/PlayerProfileNotFoundError.js";
import { PlayerVerificationError } from "./errors/PlayerVerificationError.js";
import type { PlayerVerificationEvidenceService } from "./PlayerVerificationEvidenceService.js";

export class PlayerVerificationService {
  public constructor(
    private readonly repository: PlayerVerificationRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly transactionRunner: TransactionRunner,
    private readonly evidenceService: PlayerVerificationEvidenceService,
  ) {}

  public async hasPendingRequest(playerDiscordId: string): Promise<boolean> {
    return this.repository.existsPendingForPlayer(playerDiscordId);
  }

  public async submit(
    guild: Guild,
    playerDiscordId: string,
    attachment: Attachment,
  ): Promise<PlayerVerificationDto> {
    const playerDocument =
      await this.playerRepository.findByDiscordId(playerDiscordId);

    if (!playerDocument) {
      throw new PlayerProfileNotFoundError();
    }

    const status = normalizePlayerVerificationStatus(
      playerDocument.verification?.status,
    );

    if (isPlayerVerificationApproved(status)) {
      throw new PlayerVerificationError(
        "Your Mobile Legends account is already verified.",
      );
    }

    if (await this.repository.existsPendingForPlayer(playerDiscordId)) {
      throw new PlayerVerificationError(
        "Your account verification is already waiting for Operations review.",
      );
    }

    this.evidenceService.validate(attachment);

    const player = PlayerMapper.toDto(playerDocument);
    const requestId = new Types.ObjectId().toHexString();
    const submittedAt = new Date();
    const evidence = await this.evidenceService.archive(
      guild,
      requestId,
      player,
      attachment,
    );

    try {
      return await this.transactionRunner.run(async (session) => {
        const request = await this.repository.create(
          {
            id: requestId,
            guildId: guild.id,
            playerDiscordId,
            game: {
              ign: player.game.ign,
              playerId: player.game.playerId,
              serverId: player.game.serverId,
            },
            evidence,
            submittedAt,
          },
          session,
        );

        const playerUpdated =
          await this.playerRepository.updateVerificationStatus(
            playerDiscordId,
            ["pending", "rejected"],
            {
              status: "pending",
              submittedAt,
              reviewedAt: null,
              reviewedByDiscordId: null,
              rejectionReason: null,
            },
            session,
          );

        if (!playerUpdated) {
          throw new PlayerVerificationError(
            "Your profile changed while the request was submitted. Please try again.",
          );
        }

        return PlayerVerificationMapper.toDto(request);
      });
    } catch (error: unknown) {
      await this.evidenceService.discard(guild, evidence);

      if (error instanceof PlayerVerificationError) {
        throw error;
      }

      throw new PlayerVerificationError(
        "The verification request could not be saved. Please try again.",
      );
    }
  }

  public async review(
    requestId: string,
    guildId: string,
    reviewerDiscordId: string,
    decision: PlayerVerificationDecision,
    rejectionReason?: string,
  ): Promise<PlayerVerificationDto> {
    const normalizedReason = rejectionReason?.trim().replace(/\s+/g, " ") ?? "";

    if (
      decision === "reject" &&
      (normalizedReason.length <
        PlayerVerificationConfig.rejectionReasonMinimumLength ||
        normalizedReason.length >
          PlayerVerificationConfig.rejectionReasonMaximumLength)
    ) {
      throw new PlayerVerificationError(
        "Provide a clear rejection reason between 5 and 500 characters.",
      );
    }

    return this.transactionRunner.run(async (session: ClientSession) => {
      const pending = await this.repository.findPendingById(
        requestId,
        guildId,
        session,
      );

      if (!pending) {
        throw new PlayerVerificationError(
          "This verification request is no longer pending.",
        );
      }

      const reviewedAt = new Date();
      const status = decision === "approve" ? "verified" : "rejected";
      const playerUpdated =
        await this.playerRepository.updateVerificationStatus(
          pending.playerDiscordId,
          ["pending"],
          {
            status,
            submittedAt: new Date(pending.submittedAt),
            reviewedAt,
            reviewedByDiscordId: reviewerDiscordId,
            rejectionReason:
              decision === "reject" ? normalizedReason : null,
          },
          session,
        );

      if (!playerUpdated) {
        throw new PlayerVerificationError(
          "The player profile is no longer awaiting this review.",
        );
      }

      const resolved = await this.repository.resolve(
        requestId,
        guildId,
        reviewerDiscordId,
        decision,
        decision === "reject" ? normalizedReason : null,
        reviewedAt,
        session,
      );

      if (!resolved) {
        throw new PlayerVerificationError(
          "This verification request was already reviewed.",
        );
      }

      return PlayerVerificationMapper.toDto(resolved);
    });
  }
}
