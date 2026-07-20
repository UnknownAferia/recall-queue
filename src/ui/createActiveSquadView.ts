import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import { PlayerRoleLabels } from "../constants/playerRoles.js";
import type { SquadDto } from "../dto/SquadDto.js";
import { ViewFactory } from "./ViewFactory.js";
import {
  formatSquadParticipant,
  formatSquadParticipantDetail,
} from "./formatSquadParticipant.js";

function createSquadList(squad: SquadDto): string {
  return squad.participants
    .map(
      (participant) =>
        `**${PlayerRoleLabels[participant.assignedRole]}**  ${formatSquadParticipant(participant)}\n-# ${formatSquadParticipantDetail(participant)}  •  ${participant.rsrBefore} RSR`,
    )
    .join("\n");
}

export function createActiveSquadView(squad: SquadDto): ContainerBuilder {
  return ViewFactory.createContainer(0x5865f2)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Team Formation Complete",
        "Your MLBB Squad Is Ready",
        "Create a five-player Mobile Legends lobby, invite your teammates and queue together against external opponents.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `**Captain:** <@${squad.captainDiscordId}>`,
          `**Private voice:** ${
            squad.voiceChannelId
              ? `<#${squad.voiceChannelId}>`
              : "Preparing channel..."
          }`,
          "",
          "### Squad compatibility",
          `**${squad.metrics.compatibilityScore.toFixed(1)}/100**  •  ${squad.metrics.rsrSpread.toFixed(0)} RSR spread`,
          `-# Average rating: ${squad.metrics.averageRsr.toFixed(0)} RSR  •  Average behavior: ${squad.metrics.averageBehaviorScore.toFixed(1)}/100`,
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        ["## Assigned Roles", createSquadList(squad)].join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Session controls",
          "-# The captain reports the external MLBB result. Any member can leave and disband an unusable squad.",
        ].join("\n"),
      ),
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(CustomIds.buttons.squad.result.reportWin(squad.id))
          .setLabel("Report Win")
          .setEmoji("🏆")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(CustomIds.buttons.squad.result.reportLoss(squad.id))
          .setLabel("Report Loss")
          .setEmoji("📉")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(CustomIds.buttons.squad.lifecycle.complete(squad.id))
          .setLabel("Close Without Result")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(CustomIds.buttons.squad.lifecycle.disband(squad.id))
          .setLabel("Leave & Disband")
          .setEmoji("🚪")
          .setStyle(ButtonStyle.Danger),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(`Squad ${squad.id.slice(-8).toUpperCase()}`),
    );
}
