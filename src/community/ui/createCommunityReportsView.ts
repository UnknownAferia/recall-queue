import type { ContainerBuilder } from "discord.js";

import { formatCommunityReportReference } from "../../constants/communityModeration.js";
import type { CommunityReportDocument } from "../../models/CommunityReportModel.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export function createCommunityReportsView(
  reports: readonly CommunityReportDocument[],
): ContainerBuilder {
  const body =
    reports.length === 0
      ? "No community reports are waiting for review."
      : reports
          .map((report) =>
            [
              `### ${formatCommunityReportReference(report.reportNumber)} • ${report.type}`,
              `**Target:** <@${report.targetDiscordId}> • **Reporter:** <@${report.reporterDiscordId}>`,
              report.evidence.messageId && report.evidence.channelId
                ? `**Message:** https://discord.com/channels/${report.guildId}/${report.evidence.channelId}/${report.evidence.messageId}`
                : null,
              `**Reason:** ${report.description}`,
              `-# Opened <t:${Math.floor(report.createdAt.getTime() / 1_000)}:R>`,
            ]
              .filter((line): line is string => Boolean(line))
              .join("\n"),
          )
          .join("\n\n");

  return ViewFactory.createContainer(0xf59e0b)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Operations Inbox",
        "Community Reports",
        "Review reports with `/resolve-report` and the displayed report reference.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(ViewFactory.text(body))
    .addTextDisplayComponents(
      ViewFactory.footer(`${reports.length} open report(s) shown.`),
    );
}
