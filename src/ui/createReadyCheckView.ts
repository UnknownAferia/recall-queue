import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import type { SquadDto } from "../dto/SquadDto.js";
import { ViewFactory } from "./ViewFactory.js";
import {
  formatSquadParticipant,
  formatSquadParticipantDetail,
} from "./formatSquadParticipant.js";

const ReadyStatusIcons = Object.freeze({
  pending: "⏳",
  accepted: "✅",
  declined: "❌",
});

function createParticipantList(squad: SquadDto): string {
  return squad.participants
    .map(
      (participant) =>
        `${ReadyStatusIcons[participant.readyStatus]} ${formatSquadParticipant(participant)} - ${formatSquadParticipantDetail(participant)}`,
    )
    .join("\n");
}

export function createReadyCheckView(squad: SquadDto): ContainerBuilder {
  const acceptedPlayers = squad.participants.filter(
    (participant) => participant.readyStatus === "accepted",
  ).length;

  const expirationTimestamp = Math.floor(
    squad.readyCheckExpiresAt.getTime() / 1_000,
  );

  const container = ViewFactory.createContainer(
    squad.status === "cancelled" ? 0xda373c : 0xf0b232,
  )
    .addTextDisplayComponents(
      ViewFactory.heading(
        squad.status === "cancelled" ? "Squad Cancelled" : "Squad Found",
        squad.status === "cancelled" ? "Ready Check Failed" : "Ready Check",
        squad.status === "cancelled"
          ? "A player declined or the response window expired."
          : "Five compatible teammates were found. Everyone must accept before roles are revealed.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `### ${acceptedPlayers}/${squad.participants.length} players ready`,
          squad.status === "ready_check"
            ? `Respond before <t:${expirationTimestamp}:R>.`
            : "Return to the pool when you are ready to try again.",
          "",
          createParticipantList(squad),
        ].join("\n"),
      ),
    );

  if (squad.status === "ready_check") {
    container.addSeparatorComponents(ViewFactory.separator());
    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(CustomIds.buttons.squad.readyCheck.accept(squad.id))
          .setLabel("Accept")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(CustomIds.buttons.squad.readyCheck.decline(squad.id))
          .setLabel("Decline")
          .setEmoji("✖️")
          .setStyle(ButtonStyle.Danger),
      ),
    );
  }

  return container.addTextDisplayComponents(
    ViewFactory.footer(`Squad ${squad.id.slice(-8).toUpperCase()}`),
  );
}
