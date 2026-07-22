import type { PlayerVerificationDto } from "../dto/PlayerVerificationDto.js";
import type { PlayerVerificationDocument } from "../models/PlayerVerificationModel.js";

export class PlayerVerificationMapper {
  public static toDto(
    request: PlayerVerificationDocument,
  ): PlayerVerificationDto {
    return {
      id: request.id,
      guildId: request.guildId,
      playerDiscordId: request.playerDiscordId,
      game: {
        ign: request.game.ign,
        playerId: request.game.playerId,
        serverId: request.game.serverId,
      },
      status: request.status,
      evidence: {
        archiveChannelId: request.evidence.archiveChannelId,
        archiveMessageId: request.evidence.archiveMessageId,
        archiveAttachmentId: request.evidence.archiveAttachmentId,
        fileName: request.evidence.fileName,
        contentType: request.evidence.contentType,
        size: request.evidence.size,
      },
      submittedAt: new Date(request.submittedAt),
      reviewedAt: request.reviewedAt
        ? new Date(request.reviewedAt)
        : null,
      reviewedByDiscordId:
        request.reviewedByDiscordId ?? null,
      rejectionReason: request.rejectionReason ?? null,
    };
  }
}
