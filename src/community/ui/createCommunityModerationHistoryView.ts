import type { ContainerBuilder } from "discord.js";

import { formatCommunityCaseReference } from "../../constants/communityModeration.js";
import type { CommunityModerationCaseDocument } from "../../models/CommunityModerationCaseModel.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

export function createCommunityModerationHistoryView(
  targetDiscordId: string,
  cases: readonly CommunityModerationCaseDocument[],
): ContainerBuilder {
  const history = cases.length
    ? cases
        .map((entry) =>
          [
            `**${formatCommunityCaseReference(entry.caseNumber)}** — ${entry.action.replaceAll("_", " ")}`,
            `${entry.status.toUpperCase()} • ${entry.reason}`,
            `-# <t:${Math.floor(entry.createdAt.getTime() / 1_000)}:R> • ${entry.source}`,
          ].join("\n"),
        )
        .join("\n\n")
    : "No retained Community moderation cases were found for this member.";

  return ViewFactory.createContainer(0x5865f2)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Operations",
        "Moderation History",
        `Retained Community actions for <@${targetDiscordId}>.`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(ViewFactory.text(history))
    .addTextDisplayComponents(
      ViewFactory.footer(`${cases.length} recent case(s) shown.`),
    );
}
