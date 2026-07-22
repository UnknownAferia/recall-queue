import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

import { BotConfig } from "../config/bot.js";
import { BrandColors } from "../config/brand.js";
import { CustomIds } from "../constants/customIds.js";
import type { PlayerDto } from "../dto/PlayerDto.js";
import type { PlayerVerificationDto } from "../dto/PlayerVerificationDto.js";

export function createPendingPlayerVerificationReviewView(
  requestId: string,
  player: PlayerDto,
) {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.amber)
    .setTitle("Account Verification Pending")
    .setDescription(
      "Compare the uploaded Mobile Legends profile with the registered account before deciding.",
    )
    .addFields(
      { name: "Player", value: `<@${player.discord.id}>`, inline: true },
      { name: "IGN", value: player.game.ign, inline: true },
      {
        name: "MLBB Account",
        value: `${player.game.playerId} (${player.game.serverId})`,
        inline: true,
      },
      { name: "Request", value: `\`${requestId}\``, inline: false },
    )
    .setFooter({ text: `${BotConfig.footer} • Manual account review` })
    .setTimestamp();

  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CustomIds.buttons.playerVerification.approve(requestId))
      .setLabel("Approve")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(CustomIds.buttons.playerVerification.reject(requestId))
      .setLabel("Reject")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [actions] } as const;
}

export function createResolvedPlayerVerificationReviewView(
  request: PlayerVerificationDto,
) {
  const approved = request.status === "verified";
  const embed = new EmbedBuilder()
    .setColor(approved ? BrandColors.emerald : BrandColors.rose)
    .setTitle(
      approved ? "Account Verification Approved" : "Account Verification Rejected",
    )
    .setDescription(
      approved
        ? "The player can now access Vora matchmaking."
        : "The player must submit corrected evidence before entering matchmaking.",
    )
    .addFields(
      { name: "Player", value: `<@${request.playerDiscordId}>`, inline: true },
      { name: "IGN", value: request.game.ign, inline: true },
      {
        name: "MLBB Account",
        value: `${request.game.playerId} (${request.game.serverId})`,
        inline: true,
      },
      {
        name: "Reviewed by",
        value: request.reviewedByDiscordId
          ? `<@${request.reviewedByDiscordId}>`
          : "Unknown",
        inline: true,
      },
      ...(request.rejectionReason
        ? [
            {
              name: "Reason",
              value: request.rejectionReason,
              inline: false,
            },
          ]
        : []),
      { name: "Request", value: `\`${request.id}\``, inline: false },
    )
    .setFooter({ text: `${BotConfig.footer} • Review completed` })
    .setTimestamp(request.reviewedAt ?? new Date());

  return { embeds: [embed], components: [] } as const;
}
