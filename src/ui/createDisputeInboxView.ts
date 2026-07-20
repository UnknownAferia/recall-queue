import type { ContainerBuilder } from "discord.js";

import type { SquadDto } from "../dto/SquadDto.js";
import { ViewFactory } from "./ViewFactory.js";

function formatDispute(squad: SquadDto): string {
  if (!squad.result) {
    return `### Squad ${squad.id.slice(-8).toUpperCase()}\n-# Result data unavailable`;
  }

  const disputedBy = squad.result.disputedByDiscordIds
    .map((discordId) => `<@${discordId}>`)
    .join(", ");
  const participants = squad.participants
    .map((participant) => `<@${participant.discordId}>`)
    .join("  ");
  const evidenceUrl = squad.result.evidence
    ? `https://discord.com/channels/${squad.guildId}/${squad.result.evidence.archiveChannelId}/${squad.result.evidence.archiveMessageId}`
    : null;

  return [
    `### Squad ${squad.id.slice(-8).toUpperCase()}`,
    `**Reported:** ${squad.result.outcome === "win" ? "Victory" : "Defeat"} by <@${squad.result.reportedByDiscordId}>`,
    `**Disputed by:** ${disputedBy || "Unknown"}`,
    evidenceUrl
      ? `**Evidence:** [Open archived screenshot](${evidenceUrl})`
      : "**Evidence:** Not available (legacy result)",
    `**Opened:** <t:${Math.floor((squad.closedAt ?? squad.updatedAt).getTime() / 1_000)}:R>`,
    `-# Players: ${participants}`,
    `-# Full reference: ${squad.id}`,
  ].join("\n");
}

export function createDisputeInboxView(
  squads: readonly SquadDto[],
): ContainerBuilder {
  const container = ViewFactory.createContainer(
    squads.length > 0 ? 0xfee75c : 0x23a55a,
  )
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Staff Operations",
        "Dispute Review Inbox",
        squads.length > 0
          ? `${squads.length} disputed result${squads.length === 1 ? " is" : "s are"} awaiting staff review.`
          : "No disputed match results currently require attention.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator());

  if (squads.length === 0) {
    container.addTextDisplayComponents(
      ViewFactory.text("✅ **Inbox clear**\n-# New disputes will appear here."),
    );
  } else {
    for (const squad of squads) {
      container.addTextDisplayComponents(
        ViewFactory.text(formatDispute(squad)),
      );
      container.addSeparatorComponents(ViewFactory.separator());
    }
  }

  return container.addTextDisplayComponents(
    ViewFactory.footer(
      "Inspect a case with /disputes, then close it with /resolve-dispute.",
    ),
  );
}
