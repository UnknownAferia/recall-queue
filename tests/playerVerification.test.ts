import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Attachment } from "discord.js";

import {
  CustomIds,
  parsePlayerVerificationRejectionCustomId,
  parsePlayerVerificationReviewCustomId,
} from "../src/constants/customIds.js";
import {
  isPlayerVerificationApproved,
  normalizePlayerVerificationStatus,
} from "../src/constants/playerVerification.js";
import { PlayerModel } from "../src/models/PlayerModel.js";
import { PlayerVerificationModel } from "../src/models/PlayerVerificationModel.js";
import type { PlayerRepository } from "../src/repositories/PlayerRepository.js";
import type { QueueRepository } from "../src/repositories/QueueRepository.js";
import type { SquadRepository } from "../src/repositories/SquadRepository.js";
import type { PlayerVerificationRepository } from "../src/repositories/PlayerVerificationRepository.js";
import type { TransactionRunner } from "../src/database/MongoTransactionRunner.js";
import { PlayerVerificationEvidenceService } from "../src/services/PlayerVerificationEvidenceService.js";
import { PlayerVerificationService } from "../src/services/PlayerVerificationService.js";
import { QueueService } from "../src/services/QueueService.js";
import { PlayerVerificationRequiredError } from "../src/services/errors/PlayerVerificationRequiredError.js";
import { createPlayerVerificationModal } from "../src/ui/createPlayerVerificationModal.js";
import { createPlayerVerificationRejectionModal } from "../src/ui/createPlayerVerificationRejectionModal.js";

function createAttachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: "verification-source",
    name: "profile.png",
    contentType: "image/png",
    size: 2_048,
    width: 1_920,
    height: 1_080,
    url: "https://cdn.discordapp.com/profile.png",
    ...overrides,
  } as Attachment;
}

describe("Player account verification", () => {
  it("keeps legacy profiles approved while distinguishing new states", async () => {
    assert.equal(normalizePlayerVerificationStatus(undefined), "legacy_verified");
    assert.equal(isPlayerVerificationApproved("legacy_verified"), true);
    assert.equal(isPlayerVerificationApproved("verified"), true);
    assert.equal(isPlayerVerificationApproved("pending"), false);
    assert.equal(isPlayerVerificationApproved("rejected"), false);

    const legacyPlayer = new PlayerModel({
      discord: { id: "player-id", username: "Player" },
      game: { ign: "Player", playerId: "123456", serverId: "1234" },
      rating: {},
      statistics: {},
      behavior: {},
      queue: {},
      preferences: { roles: {} },
    });

    assert.equal(legacyPlayer.verification?.status, "legacy_verified");
    await assert.doesNotReject(legacyPlayer.validate());
  });

  it("validates review routes and upload modals", () => {
    const requestId = "507f1f77bcf86cd799439011";

    assert.deepEqual(
      parsePlayerVerificationReviewCustomId(
        CustomIds.buttons.playerVerification.approve(requestId),
      ),
      { action: "approve", requestId },
    );
    assert.equal(
      parsePlayerVerificationRejectionCustomId(
        CustomIds.modals.playerVerificationRejection.submit(requestId),
      ),
      requestId,
    );
    assert.doesNotThrow(() => createPlayerVerificationModal().toJSON());
    assert.doesNotThrow(() =>
      createPlayerVerificationRejectionModal(requestId).toJSON(),
    );
  });

  it("accepts safe screenshots and rejects unsupported evidence", () => {
    const service = new PlayerVerificationEvidenceService();

    assert.equal(service.validate(createAttachment()), "image/png");
    assert.throws(() =>
      service.validate(createAttachment({ contentType: "application/pdf" })),
    );
    assert.throws(() =>
      service.validate(createAttachment({ width: null, height: null })),
    );
  });

  it("validates a persisted pending request snapshot", async () => {
    const request = new PlayerVerificationModel({
      guildId: "guild-id",
      playerDiscordId: "player-id",
      game: { ign: "Player", playerId: "123456", serverId: "1234" },
      status: "pending",
      evidence: {
        archiveChannelId: "channel-id",
        archiveMessageId: "message-id",
        archiveAttachmentId: "attachment-id",
        fileName: "profile.png",
        contentType: "image/png",
        size: 2_048,
      },
      submittedAt: new Date(),
    });

    await assert.doesNotReject(request.validate());
  });

  it("blocks pending players before any queue mutation", async () => {
    const queueService = new QueueService(
      {
        getOrCreate: async () => {
          throw new Error("Queue repository must not be reached");
        },
      } as unknown as QueueRepository,
      {
        findByDiscordId: async () => ({
          verification: { status: "pending" },
          preferences: {
            roles: { primary: "jungle", secondary: "mid" },
          },
          queue: { bannedUntil: null },
        }),
      } as unknown as PlayerRepository,
      {} as SquadRepository,
    );

    await assert.rejects(
      queueService.joinQueue("guild-id", "player-id"),
      PlayerVerificationRequiredError,
    );
  });

  it("reviews a pending request and updates the player atomically", async () => {
    const pending = new PlayerVerificationModel({
      guildId: "guild-id",
      playerDiscordId: "player-id",
      game: { ign: "Player", playerId: "123456", serverId: "1234" },
      status: "pending",
      evidence: {
        archiveChannelId: "channel-id",
        archiveMessageId: "message-id",
        archiveAttachmentId: "attachment-id",
        fileName: "profile.png",
        contentType: "image/png",
        size: 2_048,
      },
      submittedAt: new Date("2026-07-22T12:00:00.000Z"),
    });
    const events: string[] = [];
    const verificationRepository = {
      findPendingById: async () => pending,
      resolve: async () => {
        events.push("request-resolved");
        pending.status = "verified";
        pending.reviewedAt = new Date();
        pending.reviewedByDiscordId = "reviewer-id";
        return pending;
      },
    } as unknown as PlayerVerificationRepository;
    const playerRepository = {
      updateVerificationStatus: async () => {
        events.push("player-updated");
        return true;
      },
    } as unknown as PlayerRepository;
    const transactionRunner = {
      run: async <T>(operation: (session: never) => Promise<T>) =>
        operation({} as never),
    } as TransactionRunner;
    const service = new PlayerVerificationService(
      verificationRepository,
      playerRepository,
      transactionRunner,
      new PlayerVerificationEvidenceService(),
    );

    const result = await service.review(
      pending.id,
      "guild-id",
      "reviewer-id",
      "approve",
    );

    assert.equal(result.status, "verified");
    assert.deepEqual(events, ["player-updated", "request-resolved"]);
  });
});
