import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import { SquadConfig } from "../constants/squad.js";
import type { SquadDto } from "../dto/SquadDto.js";
import { ViewFactory } from "./ViewFactory.js";
import {
  formatSquadParticipant,
  formatSquadParticipantDetail,
} from "./formatSquadParticipant.js";

function createParticipantResponses(squad: SquadDto): string {
  if (!squad.result) {
    return "";
  }

  return squad.participants
    .map((participant) => {
      const confirmed = squad.result?.confirmedByDiscordIds.includes(
        participant.discordId,
      );
      const disputed = squad.result?.disputedByDiscordIds.includes(
        participant.discordId,
      );
      const icon = disputed ? "❌" : confirmed ? "✅" : "⏳";

      return `${icon} ${formatSquadParticipant(participant)}  -# ${formatSquadParticipantDetail(participant)}`;
    })
    .join("\n");
}

export function createResultVerificationView(
  squad: SquadDto,
): ContainerBuilder {
  if (!squad.result) {
    throw new Error("A result report is required for verification.");
  }

  const outcomeLabel = squad.result.outcome === "win" ? "Victory" : "Defeat";

  return ViewFactory.createContainer(0xf0b232)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "External Match Result",
        `${outcomeLabel} Reported`,
        "Confirm whether this result matches the Mobile Legends match your squad played.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `**Reported by:** <@${squad.result.reportedByDiscordId}>`,
          `**Confirmations:** ${squad.result.confirmedByDiscordIds.length}/${SquadConfig.resultConfirmationsRequired} required`,
          `**Reported:** <t:${Math.floor(squad.result.reportedAt.getTime() / 1_000)}:R>`,
          squad.result.evidence
            ? "**Evidence:** Screenshot archived for staff review"
            : "**Evidence:** Legacy report without screenshot",
          squad.voiceChannelId
            ? `**Private voice:** <#${squad.voiceChannelId}>`
            : null,
          "",
          "### Squad responses",
          createParticipantResponses(squad),
        ]
          .filter((line): line is string => line !== null)
          .join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(CustomIds.buttons.squad.result.confirm(squad.id))
          .setLabel("Confirm Result")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(CustomIds.buttons.squad.result.dispute(squad.id))
          .setLabel("Dispute Result")
          .setEmoji("⚠️")
          .setStyle(ButtonStyle.Danger),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "A dispute closes the session without changing any rating.",
      ),
    );
}
