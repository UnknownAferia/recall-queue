interface CommunityEnvironment {
  readonly discordToken: string;
  readonly discordClientId: string;
  readonly discordGuildIds: readonly string[];
}

function optionalEnvironmentVariable(name: string): string | undefined {
  const value = process.env[name]?.trim();

  return value || undefined;
}

function parseDiscordGuildIds(): readonly string[] {
  const rawValue =
    optionalEnvironmentVariable("DISCORD_GUILD_IDS") ??
    optionalEnvironmentVariable("DISCORD_GUILD_ID");

  if (!rawValue) {
    return [];
  }

  const guildIds = [
    ...new Set(
      rawValue
        .split(",")
        .map((guildId) => guildId.trim())
        .filter(Boolean),
    ),
  ];
  const invalidGuildId = guildIds.find(
    (guildId) => !/^\d{17,20}$/.test(guildId),
  );

  if (invalidGuildId) {
    throw new Error(
      `Invalid Discord guild ID in DISCORD_GUILD_IDS: ${invalidGuildId}`,
    );
  }

  return Object.freeze(guildIds);
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const communityEnv: Readonly<CommunityEnvironment> = Object.freeze({
  discordToken: requireEnvironmentVariable("VORA_COMMUNITY_DISCORD_TOKEN"),
  discordClientId: requireEnvironmentVariable(
    "VORA_COMMUNITY_DISCORD_CLIENT_ID",
  ),
  discordGuildIds: parseDiscordGuildIds(),
});
