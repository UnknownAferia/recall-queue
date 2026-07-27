import type { ContainerBuilder } from "discord.js";

import { BrandColors } from "../../config/brand.js";
import type {
  QueueActivationMetrics,
  QueueSessionSummary,
} from "../../types/queueActivation.js";
import { ViewFactory } from "../../ui/ViewFactory.js";
import type { OnboardingSnapshot } from "./createOnboardingDashboardView.js";

function sessionLine(session: QueueSessionSummary): string {
  const start = Math.floor(session.startsAt.getTime() / 1_000);
  const end = Math.floor(session.endsAt.getTime() / 1_000);
  const state = session.status === "live" ? "🟢 LIVE" : "📅 Scheduled";

  return `- **${session.title}** · ${state} · <t:${start}:F>–<t:${end}:t>\n  Session: \`${session.id}\``;
}

export function createUpcomingQueueSessionsView(
  sessions: readonly QueueSessionSummary[],
): ContainerBuilder {
  return ViewFactory.createContainer(BrandColors.voraCyan)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Squad Activity",
        "Community Queue Sessions",
        "Planned times when Vora players meet in the teammate pool.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        sessions.length === 0
          ? "> No community queue session is currently scheduled."
          : sessions.map(sessionLine).join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Times automatically appear in your local Discord timezone.",
      ),
    );
}

export function createQueueSessionScheduledView(
  session: QueueSessionSummary,
): ContainerBuilder {
  const start = Math.floor(session.startsAt.getTime() / 1_000);
  const end = Math.floor(session.endsAt.getTime() / 1_000);

  return ViewFactory.createContainer(BrandColors.emerald)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Operations",
        "Queue Session Scheduled",
        `**${session.title}** is now visible in matchmaking status.`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `**Starts:** <t:${start}:F> · <t:${start}:R>`,
          `**Ends:** <t:${end}:F>`,
          `**Session:** \`${session.id}\``,
          "",
          "> Opted-in players receive one controlled reminder before the session.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(ViewFactory.footer());
}

export function createQueueNeedPlayersView(
  alertRoleId: string,
  queuedPlayers: number,
  maximumPlayers: number,
): ContainerBuilder {
  const missingPlayers = Math.max(0, maximumPlayers - queuedPlayers);

  return ViewFactory.createContainer(BrandColors.voraCyan)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Squad Alert",
        `${missingPlayers} More ${missingPlayers === 1 ? "Player" : "Players"} Needed`,
        `<@&${alertRoleId}> Vora currently has **${queuedPlayers}/${maximumPlayers}** players in the teammate pool.`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        "Join the managed **queue-lobby** voice channel, open `/vora` and enter the queue if you are ready to play.",
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Opt-in alert · Queue notifications use milestones and a 30-minute cooldown.",
      ),
    );
}

export function createQueueSessionReminderView(
  alertRoleId: string,
  session: QueueSessionSummary,
): ContainerBuilder {
  const start = Math.floor(session.startsAt.getTime() / 1_000);
  const end = Math.floor(session.endsAt.getTime() / 1_000);

  return ViewFactory.createContainer(BrandColors.amber)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Community Session",
        session.title,
        `<@&${alertRoleId}> A planned Vora queue session begins <t:${start}:R>.`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `**Start:** <t:${start}:F>`,
          `**End:** <t:${end}:t>`,
          "",
          "Join **queue-lobby** when you are ready and use `/vora` to enter the teammate pool.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(ViewFactory.footer("One reminder per session."));
}

export function createQueueSessionClosedView(
  session: QueueSessionSummary,
  closedAt: Date,
): ContainerBuilder {
  const closed = Math.floor(closedAt.getTime() / 1_000);
  const cancelled = session.status === "cancelled";

  return ViewFactory.createContainer(BrandColors.slate)
    .addTextDisplayComponents(
      ViewFactory.heading(
        cancelled ? "Session Cancelled" : "Session Complete",
        session.title,
        cancelled
          ? "This community queue session is no longer scheduled."
          : "This community queue session has ended.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `**Closed:** <t:${closed}:R>`,
          "",
          "Use **Upcoming Sessions** in matchmaking status to see the next planned queue time.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "This completed notice will be removed automatically.",
      ),
    );
}

export function createActivationDashboardView(
  onboarding: OnboardingSnapshot,
  metrics: QueueActivationMetrics,
): ContainerBuilder {
  const registrationRate =
    onboarding.eligibleMembers === 0
      ? 0
      : Math.round(
          (onboarding.registered / onboarding.eligibleMembers) * 100,
        );
  const verificationRate =
    onboarding.eligibleMembers === 0
      ? 0
      : Math.round((onboarding.verified / onboarding.eligibleMembers) * 100);
  const completionRate =
    metrics.squadsFormed === 0
      ? 0
      : Math.round((metrics.completedSquads / metrics.squadsFormed) * 100);

  return ViewFactory.createContainer(BrandColors.voraCyan)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Operations",
        "Activation & Activity",
        `Player conversion and real squad activity across the last ${metrics.windowDays} days.`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Player conversion",
          `**Eligible human players:** ${onboarding.eligibleMembers}`,
          `**Registered:** ${onboarding.registered} · ${registrationRate}%`,
          `**Verified:** ${onboarding.verified} · ${verificationRate}%`,
          `**Awaiting review:** ${onboarding.awaitingOperationsReview}`,
          `**Screenshot required:** ${onboarding.verificationRequired}`,
          "",
          "### Queue activation",
          `**Squad Alert subscribers:** ${metrics.alertSubscribers}`,
          `**Waiting now:** ${metrics.queuedPlayers}`,
          `**Unique active players:** ${metrics.uniqueActivePlayers}`,
          `**Squads formed:** ${metrics.squadsFormed}`,
          `**Verified completions:** ${metrics.completedSquads} · ${completionRate}%`,
          "",
          "### Community sessions",
          `**Upcoming or live:** ${metrics.scheduledSessions}`,
          `**Completed in window:** ${metrics.completedSessions}`,
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Use these figures to improve onboarding and schedule queue sessions when players are available.",
      ),
    );
}
