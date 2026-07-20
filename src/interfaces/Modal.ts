import type { ModalSubmitInteraction } from "discord.js";

import type { VoraClient } from "../client/VoraClient.js";

export interface Modal {
  customId: string;
  matches?(customId: string): boolean;

  execute(
    client: VoraClient,
    interaction: ModalSubmitInteraction,
  ): Promise<void>;
}
