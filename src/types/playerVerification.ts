import type {
  PlayerVerificationContentType,
  PlayerVerificationStatus,
} from "../constants/playerVerification.js";

export interface PlayerVerificationEvidence {
  archiveChannelId: string;
  archiveMessageId: string;
  archiveAttachmentId: string;
  fileName: string;
  contentType: PlayerVerificationContentType;
  size: number;
}

export interface PlayerVerificationRequest {
  guildId: string;
  playerDiscordId: string;
  game: {
    ign: string;
    playerId: string;
    serverId: string;
  };
  status: Extract<PlayerVerificationStatus, "pending" | "verified" | "rejected">;
  evidence: PlayerVerificationEvidence;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewedByDiscordId: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlayerVerificationRequestInput {
  id: string;
  guildId: string;
  playerDiscordId: string;
  game: PlayerVerificationRequest["game"];
  evidence: PlayerVerificationEvidence;
  submittedAt: Date;
}
