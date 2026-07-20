interface Environment {
  discordToken: string;
  discordClientId: string;
  discordGuildIds: readonly string[];
  mongodbUri: string;
  mongodbDatabase: string;
  testModeEnabled: boolean;
}

function parseBooleanEnvironmentVariable(name: string): boolean {
  const value = optionalEnvironmentVariable(name)?.toLowerCase();

  if (!value) {
    return false;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${name} must be either true or false.`);
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

function optionalEnvironmentVariable(name: string): string | undefined {
  const value = process.env[name]?.trim();

  return value || undefined;
}

export const env: Readonly<Environment> = Object.freeze({
  discordToken: requireEnvironmentVariable("DISCORD_TOKEN"),
  discordClientId: requireEnvironmentVariable("DISCORD_CLIENT_ID"),
  discordGuildIds: parseDiscordGuildIds(),
  mongodbUri: requireEnvironmentVariable("MONGODB_URI"),
  mongodbDatabase: requireEnvironmentVariable("MONGODB_DATABASE"),
  testModeEnabled: parseBooleanEnvironmentVariable("VORA_TEST_MODE"),
});
