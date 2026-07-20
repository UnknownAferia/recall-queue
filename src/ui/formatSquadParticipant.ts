import { escapeMarkdown } from "discord.js";

import { isSimulationDiscordId } from "../constants/developmentSimulation.js";
import type { SquadParticipantDto } from "../dto/SquadDto.js";

export function formatSquadParticipant(
  participant: SquadParticipantDto,
): string {
  if (isSimulationDiscordId(participant.discordId)) {
    return `🤖 **${escapeMarkdown(participant.displayName)}**`;
  }

  return `<@${participant.discordId}>`;
}

export function formatSquadParticipantDetail(
  participant: SquadParticipantDto,
): string {
  return isSimulationDiscordId(participant.discordId)
    ? "Automated test teammate"
    : escapeMarkdown(participant.displayName);
}
