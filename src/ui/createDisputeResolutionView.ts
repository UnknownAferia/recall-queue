import type { ContainerBuilder } from "discord.js";

import type { SquadDto } from "../dto/SquadDto.js";
import { ViewFactory } from "./ViewFactory.js";

const DecisionLabels = {
  upheld: "Reported result confirmed",
  overridden: "Reported result corrected",
  voided: "Match voided",
} as const;

const SanctionLabels = {
  none: "None",
  misleading_evidence: "Misleading evidence",
  deliberate_fraud: "Deliberate result fraud",
} as const;

function formatOutcome(outcome: "win" | "loss" | null): string {
  if (outcome === null) {
    return "No result";
  }

  return outcome === "win" ? "Victory" : "Defeat";
}

export function createDisputeResolutionView(squad: SquadDto): ContainerBuilder {
  const moderation = squad.result?.moderation;

  if (!moderation) {
    throw new Error(`Squad ${squad.id} has no moderation audit.`);
  }

  const ratingSummary =
    moderation.finalOutcome === null
      ? "No statistics or rating changes were applied."
      : `${squad.result?.ratingChanges.length ?? 0} player rating changes were processed transactionally.`;
  const evidenceUrl = squad.result?.evidence
    ? `https://discord.com/channels/${squad.guildId}/${squad.result.evidence.archiveChannelId}/${squad.result.evidence.archiveMessageId}`
    : null;
  const sanction = moderation.sanction;
  const sanctionSummary = sanction
    ? sanction.action === "none"
      ? ["**Player sanction:** None"]
      : [
          `**Player sanction:** ${SanctionLabels[sanction.action]}`,
          `**Sanctioned player:** <@${sanction.targetDiscordId}>`,
          `**Behavior impact:** -${sanction.behaviorScoreLoss} points`,
          `**Integrity level:** ${sanction.integrityLevelBefore} → ${sanction.integrityLevelAfter}/3`,
          sanction.bannedUntil
            ? `**Matchmaking suspended until:** <t:${Math.floor(sanction.bannedUntil.getTime() / 1_000)}:F>`
            : null,
        ].filter((line): line is string => line !== null)
    : ["**Player sanction:** Not recorded (legacy review)"];

  return ViewFactory.createContainer(
    moderation.decision === "voided" ? 0xf0b232 : 0x23a55a,
  )
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Dispute Resolved",
        DecisionLabels[moderation.decision],
        "The moderation decision has been recorded and this case is now closed.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `**Original report:** ${formatOutcome(moderation.originalOutcome)}`,
          `**Final result:** ${formatOutcome(moderation.finalOutcome)}`,
          `**Moderator:** <@${moderation.moderatedByDiscordId}>`,
          `**Resolved:** <t:${Math.floor(moderation.moderatedAt.getTime() / 1_000)}:F>`,
          evidenceUrl
            ? `**Evidence:** [Open archived screenshot](${evidenceUrl})`
            : "**Evidence:** Not available",
          "",
          ...sanctionSummary,
          "",
          ratingSummary,
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(`Squad ${squad.id.slice(-8).toUpperCase()}`),
    );
}
