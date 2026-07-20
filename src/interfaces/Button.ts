import type { ButtonInteraction } from "discord.js";

import type { VoraClient } from "../client/VoraClient.js";

export interface Button {
  customId: string;

  matches?(customId: string): boolean;

  execute(
    client: VoraClient,
    interaction: ButtonInteraction,
  ): Promise<void>;
}
