import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import {
  formatCommunityCaseReference,
  type CommunityModerationAction,
} from "../../constants/communityModeration.js";
import type { CommunityModerationCaseDocument } from "../../models/CommunityModerationCaseModel.js";
import { ViewFactory } from "../../ui/ViewFactory.js";
import { createCommunityCaseButtonId } from "../communityModerationIds.js";

const ActionLabels: Readonly<Record<CommunityModerationAction, string>> = {
  warning: "Warning",
  timeout: "Timeout",
  timeout_removed: "Timeout Removed",
  kick: "Kick",
  ban: "Ban",
  unban: "Unban",
  message_delete: "Message Deleted",
  purge: "Messages Purged",
  channel_lock: "Channel Locked",
  channel_unlock: "Channel Unlocked",
  slowmode: "Slowmode Changed",
};

export function createCommunityModerationCaseView(
  moderationCase: CommunityModerationCaseDocument,
): ContainerBuilder {
  const reference = formatCommunityCaseReference(moderationCase.caseNumber);
  const target = moderationCase.targetDiscordId
    ? `<@${moderationCase.targetDiscordId}>`
    : "Channel action";
  const actor = moderationCase.actorDiscordId
    ? `<@${moderationCase.actorDiscordId}>`
    : "Vora Automod";
  const status = moderationCase.status.replace("_", " ").toUpperCase();
  const view = ViewFactory.createContainer(
    moderationCase.status === "failed"
      ? 0xf43f5e
      : moderationCase.status === "pending"
        ? 0xf59e0b
        : 0x5865f2,
  )
    .addTextDisplayComponents(
      ViewFactory.heading(
        `Community Moderation • ${reference}`,
        ActionLabels[moderationCase.action],
        `${status} • ${moderationCase.source.toUpperCase()}`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `**Target:** ${target}`,
          `**Moderator:** ${actor}`,
          `**Reason:** ${moderationCase.reason}`,
          moderationCase.durationMs
            ? `**Duration:** ${Math.ceil(moderationCase.durationMs / 60_000)} minutes`
            : null,
          moderationCase.pendingUntil
            ? `**Confirm before:** <t:${Math.floor(moderationCase.pendingUntil.getTime() / 1_000)}:R>`
            : null,
          moderationCase.failureReason
            ? `**Failure:** ${moderationCase.failureReason}`
            : null,
          moderationCase.reversalReason
            ? `**Reversal:** ${moderationCase.reversalReason}`
            : null,
        ]
          .filter((line): line is string => Boolean(line))
          .join("\n"),
      ),
    );

  if (moderationCase.status === "pending") {
    view.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(
            createCommunityCaseButtonId("confirm", moderationCase.id),
          )
          .setLabel("Confirm Action")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(createCommunityCaseButtonId("cancel", moderationCase.id))
          .setLabel("Cancel")
          .setEmoji("✖️")
          .setStyle(ButtonStyle.Secondary),
      ),
    );
  }

  return view.addTextDisplayComponents(
    ViewFactory.footer("Every staff action is retained in the audit history."),
  );
}
