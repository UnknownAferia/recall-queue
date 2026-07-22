import type { ContainerBuilder } from "discord.js";

import type { MatchmakingStatusSnapshot } from "../../types/community.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export function createMatchmakingStatusView(
  status: MatchmakingStatusSnapshot,
  iconAttachmentName?: string,
): ContainerBuilder {
  const operational =
    status.coreOnline &&
    status.queueStatus === "open" &&
    status.matchmakingOpen;
  const headline = operational
    ? "🟢 Matchmaking Operational"
    : status.coreOnline
      ? "🟡 Matchmaking Restricted"
      : "🔴 Core Service Unavailable";
  const heartbeat = status.coreHeartbeatAt
    ? `<t:${Math.floor(status.coreHeartbeatAt.getTime() / 1_000)}:R>`
    : "No heartbeat recorded";

  const view = ViewFactory.createContainer(
    operational ? 0x23a55a : 0xed4245,
  );

  ViewFactory.addHeading(
    view,
    "Live Service Information",
    "Matchmaking Status",
    "Current Vora Core health and teammate-pool activity.",
    iconAttachmentName,
    "Live Vora matchmaking status",
  );

  return view
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `## ${headline}`,
          `**Core heartbeat:** ${heartbeat}`,
          `**Queue access:** ${status.queueStatus === "open" ? "Open" : "Locked"}`,
          `**Matchmaking control:** ${status.matchmakingOpen ? "Open" : "Maintenance"}`,
          `**Registration:** ${status.registrationOpen ? "Open" : "Maintenance"}`,
          status.maintenanceReason ? `> ${status.maintenanceReason}` : null,
          "",
          "### Live activity",
          `**Waiting players:** ${status.queuedPlayers}`,
          `**Ready checks:** ${status.readyChecks}`,
          `**Active squads:** ${status.activeSquads}`,
          `**Results pending:** ${status.pendingResults}`,
          `**Disputes awaiting staff:** ${status.disputedResults}`,
          "",
          status.coreOnline
            ? "-# Vora Core is reporting normally."
            : "-# Do not join matchmaking until Core connectivity is restored.",
        ].filter((line): line is string => line !== null).join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.footer(
        `Automatically refreshed · Last update <t:${Math.floor(status.capturedAt.getTime() / 1_000)}:R>`,
      ),
    );
}
