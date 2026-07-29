import { createHmac } from "node:crypto";

import type { ControlSession } from "./controlAuth";

const defaultApiUrl = "http://vora-community:3100/v1/operations";

export interface ControlOperationsSnapshot {
  readonly state: {
    readonly registrationOpen: boolean;
    readonly matchmakingOpen: boolean;
    readonly reason: string | null;
  };
  readonly verificationRequests: readonly {
    readonly id: string;
    readonly ign: string;
    readonly playerId: string;
    readonly serverId: string;
    readonly evidenceUrl: string;
  }[];
  readonly reports: readonly {
    readonly number: number;
    readonly type: string;
    readonly description: string;
  }[];
  readonly sessions: readonly {
    readonly id: string;
    readonly title: string;
    readonly startsAt: string;
    readonly status: string;
  }[];
}

export async function requestControlOperations(
  session: ControlSession,
  method: "GET" | "POST",
  input?: unknown,
) {
  const secret = process.env.VORA_CONTROL_API_SECRET?.trim();
  const guildId = process.env.VORA_CONTROL_DISCORD_GUILD_ID?.trim();
  if (!secret || secret.length < 32 || !guildId) {
    throw new Error("Vora Control operations are not configured.");
  }

  const body = method === "POST" ? JSON.stringify(input ?? {}) : "";
  const timestamp = Date.now().toString();
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${session.discordId}.${guildId}.${body}`)
    .digest("hex");
  const response = await fetch(
    process.env.VORA_CONTROL_API_URL?.trim() || defaultApiUrl,
    {
      method,
      body: method === "POST" ? body : undefined,
      headers: {
        ...(method === "POST" ? { "content-type": "application/json" } : {}),
        "x-vora-timestamp": timestamp,
        "x-vora-signature": signature,
        "x-vora-actor": session.discordId,
        "x-vora-guild": guildId,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );
  const result = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String(result.error ?? "Control operation failed."));
  }
  return result;
}
