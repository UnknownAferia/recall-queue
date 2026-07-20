import type { ContainerBuilder } from "discord.js";

import type { ModerationAuditDto } from "../dto/ModerationAuditDto.js";
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
    return "Voided";
  }

  return outcome === "win" ? "Victory" : "Defeat";
}

function formatEvent(event: ModerationAuditDto): string {
  const sanction = event.sanction;
  const evidenceUrl = event.evidence
    ? `https://discord.com/channels/${event.guildId}/${event.evidence.archiveChannelId}/${event.evidence.archiveMessageId}`
    : null;

  return [
    `### ${DecisionLabels[event.decision]} · Squad ${event.squadId.slice(-8).toUpperCase()}`,
    `**Moderator:** <@${event.actorDiscordId}>`,
    `**Affected player:** <@${event.targetDiscordId}>`,
    `**Result:** ${formatOutcome(event.originalOutcome)} → ${formatOutcome(event.finalOutcome)}`,
    `**Sanction:** ${sanction ? SanctionLabels[sanction.action] : "Legacy record"}`,
    sanction && sanction.behaviorScoreLoss > 0
      ? `**Impact:** -${sanction.behaviorScoreLoss} behavior · Integrity ${sanction.integrityLevelBefore} → ${sanction.integrityLevelAfter}/3`
      : null,
    sanction?.bannedUntil
      ? `**Matchmaking suspended until:** <t:${Math.floor(sanction.bannedUntil.getTime() / 1_000)}:F>`
      : null,
    evidenceUrl
      ? `**Evidence:** [Open archived screenshot](${evidenceUrl})`
      : "**Evidence:** Not available",
    `-# Recorded <t:${Math.floor(event.occurredAt.getTime() / 1_000)}:R> · Audit ${event.id}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function createModerationAuditView(
  events: readonly ModerationAuditDto[],
  filteredPlayerDiscordId?: string,
): ContainerBuilder {
  const description = filteredPlayerDiscordId
    ? `Recent immutable moderation records affecting <@${filteredPlayerDiscordId}>.`
    : "Recent immutable moderation records for this server.";
  const container = ViewFactory.createContainer(
    events.length > 0 ? 0x5865f2 : 0x23a55a,
  )
    .addTextDisplayComponents(
      ViewFactory.heading("Staff Operations", "Moderation Audit", description),
    )
    .addSeparatorComponents(ViewFactory.separator());

  if (events.length === 0) {
    container.addTextDisplayComponents(
      ViewFactory.text(
        "✅ **No audit records found**\n-# Resolved disputes will appear here automatically.",
      ),
    );
  } else {
    for (const event of events) {
      container.addTextDisplayComponents(ViewFactory.text(formatEvent(event)));
      container.addSeparatorComponents(ViewFactory.separator());
    }
  }

  return container.addTextDisplayComponents(
    ViewFactory.footer(
      filteredPlayerDiscordId
        ? "Filtered by affected player. Audit records cannot be edited or deleted through Discord."
        : "Audit records cannot be edited or deleted through Discord.",
    ),
  );
}
