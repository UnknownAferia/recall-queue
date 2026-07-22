import type { ContainerBuilder } from "discord.js";

import type { SquadDto } from "../dto/SquadDto.js";
import { ViewFactory } from "./ViewFactory.js";

export function createResultLifecycleIncidentView(
  squad: SquadDto,
): ContainerBuilder {
  const incident = squad.lifecycleIncident;

  if (!incident) {
    throw new Error("A lifecycle incident is required for the audit view.");
  }

  const reportExpired = incident.reason === "result_report_timeout";
  const responsiblePlayers = incident.responsibleDiscordIds
    .map((discordId) => `<@${discordId}>`)
    .join(", ");

  return ViewFactory.createContainer(reportExpired ? 0xda373c : 0xf0b232)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Competitive Integrity Alert",
        reportExpired
          ? "Result Evidence Deadline Missed"
          : "Result Confirmation Deadline Missed",
        reportExpired
          ? "The squad captain did not submit the required result screenshot in time."
          : "One or more squad members did not respond to a reported result in time.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          `**Squad:** ${squad.id}`,
          `**Responsible:** ${responsiblePlayers}`,
          `**Automatic resolution:** ${reportExpired ? "Session cancelled" : "Moved to staff review"}`,
          `**Discipline:** Proportional behavior deduction and matchmaking cooldown applied`,
          `**Occurred:** <t:${Math.floor(incident.occurredAt.getTime() / 1_000)}:F>`,
          squad.result?.evidence
            ? `**Evidence:** [Open archived screenshot](https://discord.com/channels/${squad.guildId}/${squad.result.evidence.archiveChannelId}/${squad.result.evidence.archiveMessageId})`
            : "**Evidence:** None submitted",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer("Automatic lifecycle incident"),
    );
}
