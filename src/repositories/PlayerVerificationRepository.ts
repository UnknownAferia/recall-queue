import type { ClientSession } from "mongoose";

import type { PlayerVerificationDecision } from "../constants/playerVerification.js";
import {
  PlayerVerificationModel,
  type PlayerVerificationDocument,
} from "../models/PlayerVerificationModel.js";
import type { CreatePlayerVerificationRequestInput } from "../types/playerVerification.js";

export class PlayerVerificationRepository {
  public async existsPendingForPlayer(
    playerDiscordId: string,
  ): Promise<boolean> {
    return PlayerVerificationModel.exists({
      playerDiscordId,
      status: "pending",
    }).then((result) => result !== null);
  }

  public async create(
    input: CreatePlayerVerificationRequestInput,
    session: ClientSession,
  ): Promise<PlayerVerificationDocument> {
    const [request] = await PlayerVerificationModel.create(
      [
        {
          _id: input.id,
          guildId: input.guildId,
          playerDiscordId: input.playerDiscordId,
          game: input.game,
          status: "pending",
          evidence: input.evidence,
          submittedAt: input.submittedAt,
          reviewedAt: null,
          reviewedByDiscordId: null,
          rejectionReason: null,
        },
      ],
      { session },
    );

    if (!request) {
      throw new Error("MongoDB did not return the verification request.");
    }

    return request;
  }

  public async findPendingById(
    requestId: string,
    guildId: string,
    session: ClientSession,
  ): Promise<PlayerVerificationDocument | null> {
    return PlayerVerificationModel.findOne({
      _id: requestId,
      guildId,
      status: "pending",
    })
      .session(session)
      .exec();
  }

  public async resolve(
    requestId: string,
    guildId: string,
    reviewerDiscordId: string,
    decision: PlayerVerificationDecision,
    rejectionReason: string | null,
    reviewedAt: Date,
    session: ClientSession,
  ): Promise<PlayerVerificationDocument | null> {
    return PlayerVerificationModel.findOneAndUpdate(
      { _id: requestId, guildId, status: "pending" },
      {
        $set: {
          status: decision === "approve" ? "verified" : "rejected",
          reviewedAt,
          reviewedByDiscordId: reviewerDiscordId,
          rejectionReason,
        },
      },
      { returnDocument: "after", runValidators: true, session },
    ).exec();
  }
}
