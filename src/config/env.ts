interface Environment {
  discordToken: string;
  discordClientId: string;
  discordGuildId?: string;
  mongodbUri: string;
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
  discordGuildId: optionalEnvironmentVariable("DISCORD_GUILD_ID"),
  mongodbUri: requireEnvironmentVariable("MONGODB_URI"),
});