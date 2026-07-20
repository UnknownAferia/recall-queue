import type { StringSelectMenuInteraction } from "discord.js";

import type { VoraClient } from "../client/VoraClient.js";

export interface StringSelectMenu {
  readonly customId: string;

  execute(
    client: VoraClient,
    interaction: StringSelectMenuInteraction,
  ): Promise<void>;
}