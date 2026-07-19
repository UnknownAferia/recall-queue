import type { ButtonInteraction } from "discord.js";

import type { RecallClient } from "../client/RecallClient.js";

export interface Button {
  customId: string;

  execute(
    client: RecallClient,
    interaction: ButtonInteraction,
  ): Promise<void>;
}