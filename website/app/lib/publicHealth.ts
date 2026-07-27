import type {
  PublicCompetitionSnapshot,
  PublicCompetitionState,
} from "./publicCompetition";

export type PublicServiceHealth =
  | "operational"
  | "unavailable"
  | "unknown";

export interface PublicHealthReport {
  readonly schemaVersion: 1;
  readonly status: "operational" | "degraded";
  readonly checkedAt: string;
  readonly lastPublishedAt: string | null;
  readonly services: {
    readonly website: PublicServiceHealth;
    readonly community: PublicServiceHealth;
    readonly core: PublicServiceHealth;
  };
  readonly matchmaking: "open" | "paused" | "unavailable" | "unknown";
}

export const publicHealthMaximumAgeMs = 2 * 60 * 1_000;
const maximumFutureClockSkewMs = 60 * 1_000;

function snapshotIsFresh(
  snapshot: PublicCompetitionSnapshot | null,
  now: Date,
): snapshot is PublicCompetitionSnapshot {
  if (!snapshot) {
    return false;
  }

  const publishedAt = new Date(snapshot.generatedAt);
  const ageMs = now.getTime() - publishedAt.getTime();

  return (
    !Number.isNaN(publishedAt.getTime()) &&
    ageMs >= -maximumFutureClockSkewMs &&
    ageMs <= publicHealthMaximumAgeMs
  );
}

export function createPublicHealthReport(
  state: PublicCompetitionState,
  now = new Date(),
): PublicHealthReport {
  const current = snapshotIsFresh(state.snapshot, now);
  const coreOperational =
    current && state.snapshot.service.availability !== "offline";
  const status =
    current && coreOperational ? "operational" : "degraded";

  return {
    schemaVersion: 1,
    status,
    checkedAt: now.toISOString(),
    lastPublishedAt: state.snapshot?.generatedAt ?? null,
    services: {
      website: "operational",
      community: current ? "operational" : "unavailable",
      core: current
        ? coreOperational
          ? "operational"
          : "unavailable"
        : "unknown",
    },
    matchmaking: !current
      ? "unknown"
      : state.snapshot.service.availability === "online"
        ? "open"
        : state.snapshot.service.availability === "paused"
          ? "paused"
          : "unavailable",
  };
}

export function publicHealthHttpStatus(report: PublicHealthReport): 200 | 503 {
  return report.status === "operational" ? 200 : 503;
}
