import type { ModalSubmitInteraction } from "discord.js";

import type { RecallClient } from "../client/RecallClient.js";

export interface Modal {
  customId: string;

  execute(
    client: RecallClient,
    interaction: ModalSubmitInteraction,
  ): Promise<void>;
}