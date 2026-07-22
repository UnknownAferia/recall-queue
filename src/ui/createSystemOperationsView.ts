import type { ContainerBuilder } from "discord.js";

import type {
  LaunchAuditResult,
  OperationalState,
  RecoverySummary,
  SystemStatusSnapshot,
} from "../types/operations.js";
import { ViewFactory } from "./ViewFactory.js";

const timestamp = (date: Date | null): string =>
  date ? `<t:${Math.floor(date.getTime() / 1_000)}:R>` : "Never";

export function createSystemStatusView(
  status: SystemStatusSnapshot,
): ContainerBuilder {
  const operational =
    status.state.registrationOpen && status.state.matchmakingOpen;
  const view = ViewFactory.createContainer(operational ? 0x10b981 : 0xf59e0b);
  ViewFactory.addHeading(
    view,
    "Owner Operations",
    "Vora System Status",
    "Persistent access controls, service health and lifecycle workload.",
  );
  return view
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Access control",
          `**Registration:** ${status.state.registrationOpen ? "Open" : "Maintenance"}`,
          `**Matchmaking:** ${status.state.matchmakingOpen ? "Open" : "Maintenance"}`,
          status.state.reason ? `> ${status.state.reason}` : null,
          "",
          "### Services",
          `**Core heartbeat:** ${timestamp(status.coreHeartbeatAt)}`,
          `**Community heartbeat:** ${timestamp(status.communityHeartbeatAt)}`,
          `**MongoDB:** ${status.databaseLatencyMs} ms`,
          "",
          "### Lifecycle workload",
          `**Queue:** ${status.queuedPlayers} player(s)`,
          `**Ready checks / active squads:** ${status.readyChecks} / ${status.activeSquads}`,
          `**Pending results / disputes:** ${status.pendingResults} / ${status.disputedResults}`,
          `**Pending verifications:** ${status.pendingVerifications} (${status.staleVerifications} stale)`,
        ]
          .filter((line): line is string => line !== null)
          .join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(ViewFactory.footer("Live operational snapshot"));
}

export function createRecoveryView(summary: RecoverySummary): ContainerBuilder {
  const view = ViewFactory.createContainer(
    summary.warnings.length === 0 ? 0x10b981 : 0xf59e0b,
  );
  ViewFactory.addHeading(
    view,
    "Recovery Completed",
    "Lifecycle Reconciliation",
    "Vora reconciled persisted state with Discord after a restart or failure.",
  );
  return view.addSeparatorComponents(ViewFactory.separator()).addTextDisplayComponents(
    ViewFactory.text(
      [
        `**Expired ready checks:** ${summary.expiredReadyChecks}`,
        `**Expired result cases:** ${summary.expiredResultCases}`,
        `**Penalized unavailable players:** ${summary.penalizedPlayers}`,
        `**Removed stale queue entries:** ${summary.staleQueueEntries}`,
        `**Voice channels restored / removed:** ${summary.restoredVoiceChannels} / ${summary.removedVoiceChannels}`,
        summary.warnings.length ? "\n### Warnings" : null,
        ...summary.warnings.map((warning) => `- ${warning}`),
      ]
        .filter((line): line is string => line !== null)
        .join("\n"),
    ),
  );
}

export function createLaunchAuditView(result: LaunchAuditResult): ContainerBuilder {
  const failures = result.checks.filter((check) => check.level === "failure").length;
  const warnings = result.checks.filter((check) => check.level === "warning").length;
  const view = ViewFactory.createContainer(failures ? 0xed4245 : warnings ? 0xf59e0b : 0x10b981);
  ViewFactory.addHeading(
    view,
    "Launch Readiness",
    failures ? "Launch Blocked" : warnings ? "Review Recommended" : "Ready for Alpha",
    `${result.checks.length} automated environment, access and lifecycle checks completed.`,
  );
  return view.addSeparatorComponents(ViewFactory.separator()).addTextDisplayComponents(
    ViewFactory.text(
      result.checks
        .map((check) => {
          const icon = check.level === "pass" ? "✅" : check.level === "warning" ? "⚠️" : "❌";
          return `${icon} **${check.name}**\n> ${check.detail}`;
        })
        .join("\n\n"),
    ),
  );
}

export function createMaintenanceView(state: OperationalState): ContainerBuilder {
  const view = ViewFactory.createContainer(
    state.registrationOpen && state.matchmakingOpen ? 0x10b981 : 0xf59e0b,
  );
  ViewFactory.addHeading(
    view,
    "Access Control Updated",
    "Maintenance State Saved",
    "The persistent state is shared by Vora Core and Vora Community.",
  );
  return view.addSeparatorComponents(ViewFactory.separator()).addTextDisplayComponents(
    ViewFactory.text(
      [
        `**Registration:** ${state.registrationOpen ? "Open" : "Maintenance"}`,
        `**Matchmaking:** ${state.matchmakingOpen ? "Open" : "Maintenance"}`,
        state.reason ? `**Reason:** ${state.reason}` : null,
        `**Changed by:** ${state.changedByDiscordId ? `<@${state.changedByDiscordId}>` : "System"}`,
      ]
        .filter((line): line is string => line !== null)
        .join("\n"),
    ),
  );
}
