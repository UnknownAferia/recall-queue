import type { ContainerBuilder } from "discord.js";

import { BrandColors } from "../../config/brand.js";
import type {
  VerificationWorklist,
  VerificationWorklistEntry,
} from "../services/CommunityOnboardingService.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

const MaximumVisibleEntries = 15;

function evidenceRequiredLine(entry: VerificationWorklistEntry): string {
  return `- <@${entry.discordId}> · **${entry.ign}** · ${entry.profileStatus.replaceAll("_", " ")}`;
}

function reviewLine(guildId: string, entry: VerificationWorklistEntry): string {
  const reference = entry.requestId?.slice(-8).toUpperCase() ?? "UNKNOWN";
  const submitted = entry.submittedAt
    ? `<t:${Math.floor(entry.submittedAt.getTime() / 1_000)}:R>`
    : "unknown";
  const messageUrl =
    entry.evidenceHealth === "available" &&
    entry.evidenceChannelId &&
    entry.evidenceMessageId
      ? `https://discord.com/channels/${guildId}/${entry.evidenceChannelId}/${entry.evidenceMessageId}`
      : null;
  const health = {
    available: "✅ evidence available",
    channel_missing: "❌ archive channel missing",
    message_missing: "❌ review message missing",
    attachment_missing: "❌ screenshot missing",
  }[entry.evidenceHealth ?? "message_missing"];

  return [
    `- <@${entry.discordId}> · **${entry.ign}**`,
    messageUrl ? `[\`${reference}\`](${messageUrl})` : `\`${reference}\``,
    `· ${submitted} · ${health}`,
  ].join(" ");
}

function limited(
  entries: readonly VerificationWorklistEntry[],
  formatter: (entry: VerificationWorklistEntry) => string,
): string {
  if (entries.length === 0) {
    return "> Nothing currently requires attention.";
  }

  const visible = entries.slice(0, MaximumVisibleEntries).map(formatter);
  const remaining = entries.length - visible.length;

  return [
    ...visible,
    remaining > 0
      ? `- …and ${remaining} more entr${remaining === 1 ? "y" : "ies"}.`
      : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function createVerificationWorklistView(
  guildId: string,
  worklist: VerificationWorklist,
): ContainerBuilder {
  const damagedRequests = worklist.awaitingReview.filter(
    (entry) => entry.evidenceHealth !== "available",
  );

  return ViewFactory.createContainer(
    damagedRequests.length > 0 ? BrandColors.amber : BrandColors.voraCyan,
  )
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Operations",
        "Verification Worklist",
        "Every unverified player is classified by the action that is actually required.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Screenshot required",
          `${worklist.evidenceRequired.length} registered player(s) have no open verification request. No review message should exist for them yet.`,
          "",
          limited(worklist.evidenceRequired, evidenceRequiredLine),
          "",
          "> Ask these players to click **Submit Verification** in the register channel. They do not need an administrative reset.",
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Operations review",
          `${worklist.awaitingReview.length} request(s) contain submitted evidence.`,
          "",
          limited(worklist.awaitingReview, (entry) =>
            reviewLine(guildId, entry),
          ),
          "",
          damagedRequests.length > 0
            ? `⚠️ ${damagedRequests.length} request(s) lost their review artifact. Use \`/player-admin reset-verification\` for the affected player with a clear reason, then ask them to resubmit.`
            : "> Every pending request has an accessible private screenshot and review message.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "This view is read-only. Evidence recovery always requires an audited player-admin action.",
      ),
    );
}
