import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

import type { VoraClient } from "../client/VoraClient.js";

export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  enabled?: boolean;

  execute(
    client: VoraClient,
    interaction: ChatInputCommandInteraction,
  ): Promise<void>;
}
