import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import type { RecallClient } from "../client/RecallClient.js";

export interface Command {
  data: SlashCommandBuilder;

  execute(
    client: RecallClient,
    interaction: ChatInputCommandInteraction,
  ): Promise<void>;
}