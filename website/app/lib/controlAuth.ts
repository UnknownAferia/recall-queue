import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

export const controlSessionCookieName = "vora_control_session";
export const controlStateCookieName = "vora_control_oauth_state";
export const controlSessionDurationSeconds = 8 * 60 * 60;
export const controlStateDurationSeconds = 10 * 60;

const discordApiBaseUrl = "https://discord.com/api/v10";
const discordAuthorizeUrl = "https://discord.com/oauth2/authorize";
const defaultRedirectUri = "https://voramlbb.com/control/auth/callback";
const administratorPermission = BigInt(8);

export interface ControlAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly guildId: string;
  readonly allowedRoleIds: ReadonlySet<string>;
  readonly redirectUri: string;
  readonly sessionSecret: string;
}

export interface ControlSession {
  readonly discordId: string;
  readonly displayName: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

interface DiscordUser {
  readonly id: string;
  readonly username: string;
  readonly global_name?: string | null;
}

interface DiscordGuild {
  readonly id: string;
  readonly owner?: boolean;
  readonly permissions: string;
}

interface DiscordGuildMember {
  readonly roles: readonly string[];
}

interface DiscordTokenResponse {
  readonly access_token: string;
  readonly token_type: string;
}

function environmentValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getControlAuthConfig(): ControlAuthConfig | null {
  const clientId = environmentValue("VORA_CONTROL_DISCORD_CLIENT_ID");
  const clientSecret = environmentValue("VORA_CONTROL_DISCORD_CLIENT_SECRET");
  const guildId = environmentValue("VORA_CONTROL_DISCORD_GUILD_ID");
  const sessionSecret = environmentValue("VORA_CONTROL_SESSION_SECRET");

  if (
    !clientId ||
    !clientSecret ||
    !guildId ||
    !sessionSecret ||
    sessionSecret.length < 32
  ) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    guildId,
    allowedRoleIds: new Set(
      (process.env.VORA_CONTROL_ALLOWED_ROLE_IDS ?? "")
        .split(",")
        .map((roleId) => roleId.trim())
        .filter(Boolean),
    ),
    redirectUri:
      environmentValue("VORA_CONTROL_DISCORD_REDIRECT_URI") ??
      defaultRedirectUri,
    sessionSecret,
  };
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safelyMatches(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function createControlState(): string {
  return randomBytes(32).toString("base64url");
}

export function createControlSessionToken(
  session: ControlSession,
  secret: string,
): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyControlSessionToken(
  token: string,
  secret: string,
  now = new Date(),
): ControlSession | null {
  const [payload, signature, extra] = token.split(".");

  if (
    !payload ||
    !signature ||
    extra !== undefined ||
    !safelyMatches(signature, sign(payload, secret))
  ) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<ControlSession>;

    if (
      typeof session.discordId !== "string" ||
      !/^\d{17,20}$/.test(session.discordId) ||
      typeof session.displayName !== "string" ||
      session.displayName.length < 1 ||
      session.displayName.length > 80 ||
      !Number.isSafeInteger(session.issuedAt) ||
      !Number.isSafeInteger(session.expiresAt) ||
      Number(session.expiresAt) <= now.getTime() ||
      Number(session.issuedAt) > now.getTime()
    ) {
      return null;
    }

    return session as ControlSession;
  } catch {
    return null;
  }
}

export async function getControlSession(): Promise<ControlSession | null> {
  const config = getControlAuthConfig();
  if (!config) {
    return null;
  }

  const token = (await cookies()).get(controlSessionCookieName)?.value;
  return token ? verifyControlSessionToken(token, config.sessionSecret) : null;
}

export function buildDiscordAuthorizationUrl(
  config: ControlAuthConfig,
  state: string,
): URL {
  const authorizationUrl = new URL(discordAuthorizeUrl);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", config.clientId);
  authorizationUrl.searchParams.set(
    "scope",
    "identify guilds guilds.members.read",
  );
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
  return authorizationUrl;
}

async function discordRequest<T>(
  path: string,
  accessToken: string,
): Promise<T> {
  const response = await fetch(`${discordApiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Discord authorization request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function exchangeDiscordCode(
  config: ControlAuthConfig,
  code: string,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });
  const response = await fetch(`${discordApiBaseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Discord token exchange failed: ${response.status}`);
  }

  const token = (await response.json()) as Partial<DiscordTokenResponse>;
  if (!token.access_token || token.token_type?.toLowerCase() !== "bearer") {
    throw new Error("Discord returned an invalid access token response.");
  }

  return token.access_token;
}

export async function authorizeDiscordOperator(
  config: ControlAuthConfig,
  accessToken: string,
  now = new Date(),
): Promise<ControlSession | null> {
  const [user, guilds, member] = await Promise.all([
    discordRequest<DiscordUser>("/users/@me", accessToken),
    discordRequest<DiscordGuild[]>("/users/@me/guilds", accessToken),
    discordRequest<DiscordGuildMember>(
      `/users/@me/guilds/${config.guildId}/member`,
      accessToken,
    ),
  ]);
  const guild = guilds.find((candidate) => candidate.id === config.guildId);

  if (!guild || !/^\d{17,20}$/.test(user.id) || !Array.isArray(member.roles)) {
    return null;
  }

  let permissions = BigInt(0);
  try {
    permissions = BigInt(guild.permissions);
  } catch {
    return null;
  }

  const isOwner = guild.owner === true;
  const isAdministrator =
    (permissions & administratorPermission) === administratorPermission;
  const hasAllowedRole = member.roles.some((roleId) =>
    config.allowedRoleIds.has(roleId),
  );

  if (!isOwner && !isAdministrator && !hasAllowedRole) {
    return null;
  }

  const issuedAt = now.getTime();
  return {
    discordId: user.id,
    displayName: (user.global_name ?? user.username).slice(0, 80),
    issuedAt,
    expiresAt: issuedAt + controlSessionDurationSeconds * 1_000,
  };
}
