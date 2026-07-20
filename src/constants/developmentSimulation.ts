import { createHash } from "node:crypto";

import type { PlayerRole } from "./playerRoles.js";

export interface SimulationPlayerIdentity {
  readonly discordId: string;
  readonly discordUsername: string;
  readonly ign: string;
  readonly playerId: string;
  readonly serverId: string;
  readonly primaryRole: PlayerRole;
  readonly secondaryRole: PlayerRole;
  readonly rsr: number;
}

export const DevelopmentSimulationConfig = Object.freeze({
  databaseNamePattern: /(?:^|[_-])(dev|development|test|testing|sandbox)$/i,
  playerCount: 4,
});

export function isSimulationDiscordId(discordId: string): boolean {
  return discordId.startsWith("simulation:");
}

export function createSimulationDiscordId(
  guildId: string,
  index: number,
): string {
  return `simulation:${guildId}:${index}`;
}

export function createSimulationGameId(guildId: string, index: number): string {
  const digest = createHash("sha256")
    .update(`${guildId}:${index}`)
    .digest("hex")
    .slice(0, 12);

  const numericValue = BigInt(`0x${digest}`) % 900_000_000_000_000n;

  return (100_000_000_000_000n + numericValue).toString();
}
