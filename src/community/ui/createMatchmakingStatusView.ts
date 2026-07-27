import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import { CommunityCustomIds } from "../../constants/community.js";
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
  const nextSession = status.nextQueueSession;
  const sessionLines = nextSession
    ? [
        "",
        "### Next community session",
        `**${nextSession.title}** · ${nextSession.status === "live" ? "🟢 Live now" : `<t:${Math.floor(nextSession.startsAt.getTime() / 1_000)}:F>`}`,
        `Ends <t:${Math.floor(nextSession.endsAt.getTime() / 1_000)}:R>`,
      ]
    : ["", "### Next community session", "> No session is scheduled."];
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.queueActivation.toggleAlerts)
      .setLabel("Toggle Squad Alerts")
      .setEmoji("🔔")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.queueActivation.upcomingSessions)
      .setLabel("Upcoming Sessions")
      .setEmoji("📅")
      .setStyle(ButtonStyle.Secondary),
  );

  const view = ViewFactory.createContainer(
    operational ? 0x23a55a : 0xed4245,
  );

  ViewFactory.addHeading(
    view,
    "Live Service Information",
    "Matchmaking Status",
    "Current Vora Core health, five-player pool activity and community sessions.",
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
          ...sessionLines,
          "",
          "### Player controls",
          "Use **Toggle Squad Alerts** for voluntary pool and session notifications. Use **Upcoming Sessions** to view planned queue times in your local timezone.",
          "",
          status.coreOnline
            ? "-# Vora Core is reporting normally."
            : "-# Do not join matchmaking until Core connectivity is restored.",
        ].filter((line): line is string => line !== null).join("\n"),
      ),
    )
    .addActionRowComponents(actions)
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.footer(
        `Automatically refreshed · Last update <t:${Math.floor(status.capturedAt.getTime() / 1_000)}:R>`,
      ),
    );
}
