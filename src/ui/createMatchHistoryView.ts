import type { ContainerBuilder } from "discord.js";

import { PlayerRoleLabels } from "../constants/playerRoles.js";
import type { SquadDto } from "../dto/SquadDto.js";
import { createBackToMainMenuButton } from "./createBackToMainMenuButton.js";
import { ViewFactory } from "./ViewFactory.js";

function createHistoryEntry(squad: SquadDto, viewerDiscordId: string): string {
  const participant = squad.participants.find(
    (candidate) => candidate.discordId === viewerDiscordId,
  );

  const outcome = squad.result?.outcome === "win" ? "Victory" : "Defeat";
  const marker = squad.result?.outcome === "win" ? "+" : "-";
  const completedAt = squad.result?.verifiedAt ?? squad.closedAt;
  const timestamp = completedAt
    ? `<t:${Math.floor(completedAt.getTime() / 1_000)}:R>`
    : "Recently";
  const role = participant
    ? PlayerRoleLabels[participant.assignedRole]
    : "Unknown role";
  const ratingChange = squad.result?.ratingChanges.find(
    (change) => change.discordId === viewerDiscordId,
  );
  const ratingSummary = ratingChange
    ? `${ratingChange.delta >= 0 ? "+" : ""}${ratingChange.delta} RSR  •  ${ratingChange.rsrAfter.toLocaleString()} after match`
    : "Legacy result without RSR audit";

  return [
    `### ${marker} ${outcome}  |  ${role}`,
    `> ${timestamp}  •  ${squad.metrics.averageRsr.toLocaleString()} squad RSR  •  ${squad.metrics.compatibilityScore}% compatibility`,
    `> **${ratingSummary}**`,
  ].join("\n");
}

export function createMatchHistoryView(
  squads: readonly SquadDto[],
  viewerDiscordId: string,
): ContainerBuilder {
  const wins = squads.filter((squad) => squad.result?.outcome === "win").length;
  const losses = squads.length - wins;

  const container = ViewFactory.createContainer(0x3498db)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Competitive Record",
        "Verified Match History",
        "External MLBB results confirmed by your squad.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator());

  container.addTextDisplayComponents(
    ViewFactory.text(
      squads.length === 0
        ? [
            "### No verified matches yet",
            "Results appear here after your squad confirms a reported win or loss.",
            "",
            "-# Join the queue to form your next five-player squad.",
          ].join("\n")
        : [
            `**Recent record:** ${wins}W - ${losses}L`,
            "",
            ...squads.map((squad) =>
              createHistoryEntry(squad, viewerDiscordId),
            ),
          ].join("\n\n"),
    ),
  );

  return container
    .addSeparatorComponents(ViewFactory.separator())
    .addActionRowComponents(createBackToMainMenuButton())
    .addTextDisplayComponents(
      ViewFactory.footer(
        squads.length > 0
          ? `Showing your ${squads.length} most recent verified squad session${squads.length === 1 ? "" : "s"}.`
          : undefined,
      ),
    );
}
