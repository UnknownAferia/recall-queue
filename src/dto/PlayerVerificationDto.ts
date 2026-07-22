import type { PlayerVerificationStatus } from "../constants/playerVerification.js";

export interface PlayerVerificationDto {
  readonly id: string;
  readonly guildId: string;
  readonly playerDiscordId: string;
  readonly game: {
    readonly ign: string;
    readonly playerId: string;
    readonly serverId: string;
  };
  readonly status: Extract<
    PlayerVerificationStatus,
    "pending" | "verified" | "rejected"
  >;
  readonly evidence: {
    readonly archiveChannelId: string;
    readonly archiveMessageId: string;
    readonly archiveAttachmentId: string;
    readonly fileName: string;
    readonly contentType: string;
    readonly size: number;
  };
  readonly submittedAt: Date;
  readonly reviewedAt: Date | null;
  readonly reviewedByDiscordId: string | null;
  readonly rejectionReason: string | null;
}
