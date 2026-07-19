import type { ColorResolvable } from "discord.js";

interface BotConfiguration {
  name: string;
  version: string;
  embedColor: ColorResolvable;
  footer: string;
}

export const BotConfig: Readonly<BotConfiguration> = Object.freeze({
  name: "RecallQ",
  version: "2.0.0",
  embedColor: 0x5865f2,
  footer: "RecallQ Competitive Matchmaking",
});