import type { ContainerBuilder } from "discord.js";

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
        `**${PlayerRoleLabels[participant.assignedRole]}**  ${formatSquadParticipant(participant)}  -# ${formatSquadParticipantDetail(participant)}`,
    )
    .join("\n");
}

function createRatingChangeList(squad: SquadDto): string | null {
  if (!squad.result || squad.result.ratingChanges.length === 0) {
    return null;
  }

  return squad.result.ratingChanges
    .map((change) => {
      const sign = change.delta >= 0 ? "+" : "";
      return `<@${change.discordId}>  **${sign}${change.delta} RSR**  →  ${change.rsrAfter.toLocaleString()} RSR`;
    })
    .join("\n");
}

function createModerationSummary(squad: SquadDto): string | null {
  const moderation = squad.result?.moderation;

  if (!moderation) {
    return null;
  }

  const outcomeLabel = (outcome: "win" | "loss" | null): string =>
    outcome === null ? "Voided" : outcome === "win" ? "Victory" : "Defeat";
  const sanction = moderation.sanction;
  const sanctionLabel =
    !sanction || sanction.action === "none"
      ? "None"
      : sanction.action === "misleading_evidence"
        ? `Misleading evidence (<@${sanction.targetDiscordId}>, -${sanction.behaviorScoreLoss} behavior)`
        : `Deliberate result fraud (<@${sanction.targetDiscordId}>, -${sanction.behaviorScoreLoss} behavior)`;

  return [
    "### Staff review",
    `**Original report:** ${outcomeLabel(moderation.originalOutcome)}`,
    `**Final result:** ${outcomeLabel(moderation.finalOutcome)}`,
    `**Moderator:** <@${moderation.moderatedByDiscordId}>`,
    `**Player sanction:** ${sanctionLabel}`,
    `-# Resolved <t:${Math.floor(moderation.moderatedAt.getTime() / 1_000)}:R>`,
  ].join("\n");
}

function createHeading(squad: SquadDto): {
  eyebrow: string;
  title: string;
  description: string;
  color: number;
} {
  if (squad.result?.moderation?.decision === "voided") {
    return {
      eyebrow: "Staff Review Completed",
      title: "Match Voided",
      description:
        "Staff closed the disputed result without applying statistics or rating changes.",
      color: 0xf0b232,
    };
  }

  if (squad.result?.moderation) {
    return {
      eyebrow: "Staff Review Completed",
      title:
        squad.result.outcome === "win"
          ? "Victory Confirmed"
          : "Defeat Confirmed",
      description:
        "Staff resolved the disputed result. Statistics and RSR have been updated from the final decision.",
      color: 0x23a55a,
    };
  }

  const readyCheckExpired =
    squad.status === "cancelled" &&
    squad.closedByDiscordId === null &&
    squad.participants.some(
      (participant) => participant.readyStatus === "pending",
    );

  if (readyCheckExpired) {
    return {
      eyebrow: "Ready Check Expired",
      title: "Squad Formation Cancelled",
      description:
        "Not every player responded in time. Unavailable players received a temporary matchmaking cooldown.",
      color: 0xda373c,
    };
  }

  if (squad.status === "disputed") {
    return {
      eyebrow: "Result Disputed",
      title: "Manual Review Required",
      description:
        "A squad member disputed the reported result. No rating change has been applied.",
      color: 0xda373c,
    };
  }

  if (squad.status === "completed" && squad.result) {
    return {
      eyebrow: "Result Verified",
      title:
        squad.result.outcome === "win"
          ? "Victory Confirmed"
          : "Defeat Confirmed",
      description:
        "The squad verified this external Mobile Legends result. Statistics and RSR have been updated.",
      color: 0x23a55a,
    };
  }

  if (squad.status === "completed") {
    return {
      eyebrow: "Session Completed",
      title: "Ready for Another Queue",
      description:
        "The captain closed this squad without recording a match result.",
      color: 0x23a55a,
    };
  }

  return {
    eyebrow: "Squad Disbanded",
    title: "Squad Session Closed",
    description:
      "A squad member ended this session. All members may enter matchmaking again.",
    color: 0xda373c,
  };
}

export function createClosedSquadView(squad: SquadDto): ContainerBuilder {
  const heading = createHeading(squad);
  const ratingChanges = createRatingChangeList(squad);
  const moderationSummary = createModerationSummary(squad);

  return ViewFactory.createContainer(heading.color)
    .addTextDisplayComponents(
      ViewFactory.heading(heading.eyebrow, heading.title, heading.description),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          squad.result
            ? `**Reported result:** ${squad.result.outcome === "win" ? "Victory" : "Defeat"}`
            : null,
          squad.result
            ? `**Confirmations:** ${squad.result.confirmedByDiscordIds.length}`
            : null,
          squad.result?.evidence ? "**Evidence:** Screenshot archived" : null,
          squad.closedByDiscordId
            ? `**Closed by:** <@${squad.closedByDiscordId}>`
            : null,
          squad.closedAt
            ? `**Closed:** <t:${Math.floor(squad.closedAt.getTime() / 1_000)}:R>`
            : null,
          moderationSummary ? "" : null,
          moderationSummary,
          "",
          "### Previous squad",
          createSquadList(squad),
          ratingChanges ? "" : null,
          ratingChanges ? "### RSR changes" : null,
          ratingChanges,
        ]
          .filter((line): line is string => line !== null)
          .join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(`Squad ${squad.id.slice(-8).toUpperCase()}`),
    );
}
