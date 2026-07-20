interface BotConfiguration {
  name: string;
  version: string;
  embedColor: number;
  footer: string;
}

export const BotConfig: Readonly<BotConfiguration> = Object.freeze({
  name: "Vora",
  version: "2.0.0",
  embedColor: 0x5865f2,
  footer: "Vora Competitive Matchmaking",
});
