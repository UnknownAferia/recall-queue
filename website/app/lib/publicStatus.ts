import { readFile } from "node:fs/promises";

export type PublicStatusCondition = "operational" | "degraded" | "outage";

export interface PublicStatusSnapshot {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly condition: PublicStatusCondition;
  readonly services: {
    readonly website: "operational";
    readonly community: "operational";
    readonly core: PublicStatusCondition;
    readonly matchmaking: "online" | "paused" | "offline";
  };
  readonly history: readonly {
    readonly date: string;
    readonly checks: number;
    readonly successfulChecks: number;
  }[];
  readonly incidents: readonly {
    readonly id: string;
    readonly startedAt: string;
    readonly resolvedAt: string | null;
    readonly title: string;
    readonly impact: "degraded" | "outage";
  }[];
}

const snapshotFile = "/app/public-data/status.json";

export function parsePublicStatusSnapshot(
  value: unknown,
): PublicStatusSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const snapshot = value as Partial<PublicStatusSnapshot>;
  if (
    snapshot.schemaVersion !== 1 ||
    typeof snapshot.generatedAt !== "string" ||
    !["operational", "degraded", "outage"].includes(
      String(snapshot.condition),
    ) ||
    !snapshot.services ||
    !Array.isArray(snapshot.history) ||
    !Array.isArray(snapshot.incidents)
  ) {
    return null;
  }

  return snapshot as PublicStatusSnapshot;
}

export async function readPublicStatusSnapshot() {
  try {
    return parsePublicStatusSnapshot(
      JSON.parse(await readFile(snapshotFile, "utf8")),
    );
  } catch {
    return null;
  }
}
