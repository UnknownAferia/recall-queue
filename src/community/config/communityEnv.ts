interface CommunityEnvironment {
  readonly discordToken: string;
  readonly discordClientId: string;
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
});
