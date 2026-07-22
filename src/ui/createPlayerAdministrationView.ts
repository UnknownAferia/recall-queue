import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ContainerBuilder,
} from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import type {
  PlayerAdministrationInspection,
  PlayerAdministrationOperation,
} from "../types/playerAdministration.js";
import { ViewFactory } from "./ViewFactory.js";

function date(value: Date | null): string {
  return value ? `<t:${Math.floor(value.getTime() / 1_000)}:F>` : "Never";
}

export function createPlayerAdministrationInspectionView(
  inspection: PlayerAdministrationInspection,
): ContainerBuilder {
  const { player, history } = inspection;
  const roles = player.preferences.roles;
  const blockers = inspection.unregisterBlockers.length
    ? inspection.unregisterBlockers.map((entry) => `- ${entry}`).join("\n")
    : "✅ This profile is unused and eligible for controlled unregistration.";

  return ViewFactory.createContainer(inspection.canUnregister ? 0x23a55a : 0x5865f2)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Staff Operations",
        `Player Inspection · ${player.game.ign}`,
        `Complete lifecycle status for <@${player.discord.id}> (\`${player.discord.id}\`).`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Identity & verification",
          `**Profile ID:** \`${player.id}\``,
          `**MLBB:** ${player.game.playerId} (${player.game.serverId})`,
          `**Verification:** ${player.verification.status.replaceAll("_", " ")}`,
          `**Submitted:** ${date(player.verification.submittedAt)} · **Reviewed:** ${date(player.verification.reviewedAt)}`,
          player.verification.rejectionReason
            ? `**Last rejection:** ${player.verification.rejectionReason}`
            : null,
          "",
          "### Competitive standing",
          `**RSR:** ${player.rating.rsr} · **Confidence:** ${player.rating.confidence}%`,
          `**Matches:** ${player.statistics.matchesPlayed} · **W/L:** ${player.statistics.wins}/${player.statistics.losses}`,
          `**Roles:** ${roles.primary ?? "Not set"} / ${roles.secondary ?? "Not set"} · Avoid ${roles.avoided ?? "None"}`,
          `**Behavior:** ${player.behavior.score}/100 · ${player.behavior.penalties} penalties · Integrity ${player.behavior.integrityLevel}/3`,
          `**Queue discipline:** ${player.queue.disciplineLevel}/3 · ${player.queue.declinedMatches} declined or missed`,
          "",
          "### Linked records",
          `**Current queues:** ${history.queueGuildIds.length}`,
          `**Active squad:** ${history.activeSquadId ? `\`${history.activeSquadId}\`` : "None"}`,
          `**Competitive squads:** ${history.competitiveSquads}`,
          `**Season memberships:** ${history.seasonMemberships}`,
          `**Moderation/report records:** ${history.moderationRecords}`,
          `**Pending verification requests:** ${history.pendingVerifications}`,
          "",
          "### Unregistration safety",
          blockers,
        ]
          .filter((line): line is string => line !== null)
          .join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.footer("Inspection is read-only. Protected history is never removed."),
    );
}

export function createPlayerAdministrationConfirmationView(
  operation: PlayerAdministrationOperation,
  inspection: PlayerAdministrationInspection,
): ContainerBuilder {
  const unregistering = operation.action === "unregister";
  const actionLabel = unregistering
    ? "Permanently Unregister Profile"
    : "Reset Account Verification";
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(
        CustomIds.buttons.playerAdministration.confirm(
          operation.action,
          operation.id,
        ),
      )
      .setLabel(`Confirm ${unregistering ? "Unregister" : "Reset"}`)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(
        CustomIds.buttons.playerAdministration.cancel(
          operation.action,
          operation.id,
        ),
      )
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary),
  );

  return ViewFactory.createContainer(0xda373c)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Confirmation Required",
        actionLabel,
        `Target: <@${operation.targetDiscordId}> · **${inspection.player.game.ign}**`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `**Staff reason:** ${operation.reason}`,
          `**Confirmation expires:** <t:${Math.floor(operation.expiresAt.getTime() / 1_000)}:R>`,
          "",
          unregistering
            ? "⚠️ The unused player profile will be deleted. Queue entries and open verification requests will be closed, and all managed player/progression roles will be removed."
            : "⚠️ Verification returns to Pending. Queue entries and open verification requests will be closed, and the Verified Player role will be removed.",
          "",
          "Match, season and moderation records are protected by a final transactional safety check.",
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addActionRowComponents(actions)
    .addTextDisplayComponents(ViewFactory.footer(`Audit ${operation.id}`));
}

export function createPlayerAdministrationOutcomeView(
  operation: PlayerAdministrationOperation,
  managedRolesRemoved = 0,
  evidenceMessagesRemoved = 0,
): ContainerBuilder {
  if (operation.status !== "completed") {
    const descriptions: Record<string, string> = {
      cancelled: "The staff member cancelled this operation. No player data was changed.",
      expired: "The confirmation expired. No player data was changed.",
      blocked: `The final safety check prevented this operation: ${operation.blockerReasons.join(" ")}`,
    };

    return ViewFactory.createContainer(operation.status === "blocked" ? 0xda373c : 0x747f8d)
      .addTextDisplayComponents(
        ViewFactory.heading(
          "Player Administration",
          operation.status === "blocked" ? "Operation Blocked" : "Operation Closed",
          descriptions[operation.status] ?? "This operation is no longer available.",
        ),
      )
      .addTextDisplayComponents(ViewFactory.footer(`Audit ${operation.id}`));
  }

  const result = operation.result;
  return ViewFactory.createContainer(0x23a55a)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Action Completed",
        operation.action === "unregister"
          ? "Player Unregistered"
          : "Verification Reset",
        `The lifecycle action for <@${operation.targetDiscordId}> was committed safely.`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `**Queue records cleaned:** ${result?.queuesRemoved ?? 0}`,
          `**Open verifications closed:** ${result?.verificationRequestsClosed ?? 0}`,
          `**Evidence messages removed:** ${evidenceMessagesRemoved}`,
          `**Managed Discord roles removed:** ${managedRolesRemoved}`,
          `**Profile deleted:** ${result?.playerDeleted ? "Yes" : "No — profile and history retained"}`,
          `**Staff reason:** ${operation.reason}`,
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(ViewFactory.footer(`Audit ${operation.id}`));
}
