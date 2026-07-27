import { readFile } from "node:fs/promises";

export interface PublicLeaderboardEntry {
  readonly rank: number;
  readonly ign: string;
  readonly rsr: number;
  readonly division: string;
  readonly matchesPlayed: number;
  readonly wins: number;
  readonly winRate: number;
}

export interface PublicCompetitionSnapshot {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly community: {
    readonly name: string;
  };
  readonly service: {
    readonly availability: "online" | "paused" | "offline";
    readonly registrationOpen: boolean;
    readonly matchmakingOpen: boolean;
    readonly maintenanceReason: string | null;
  };
  readonly pool: {
    readonly waitingPlayers: number;
    readonly readyChecks: number;
    readonly activeSquads: number;
  };
  readonly nextSession: {
    readonly title: string;
    readonly startsAt: string;
    readonly endsAt: string;
    readonly status: "scheduled" | "live" | "cancelled" | "completed";
  } | null;
  readonly season: {
    readonly sequence: number;
    readonly name: string;
    readonly status: "scheduled" | "active" | "completed";
    readonly startsAt: string;
    readonly endsAt: string;
    readonly placementMatches: number;
  } | null;
  readonly seasonalLeaderboard: readonly PublicLeaderboardEntry[];
  readonly lifetimeLeaderboard: readonly PublicLeaderboardEntry[];
}

export interface PublicCompetitionState {
  readonly snapshot: PublicCompetitionSnapshot | null;
  readonly stale: boolean;
}

const snapshotFile = "/app/public-data/competition.json";
const maximumSnapshotAgeMs = 10 * 60 * 1_000;

function isLeaderboardEntry(value: unknown): value is PublicLeaderboardEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return (
    typeof entry.rank === "number" &&
    typeof entry.ign === "string" &&
    typeof entry.rsr === "number" &&
    typeof entry.division === "string" &&
    typeof entry.matchesPlayed === "number" &&
    typeof entry.wins === "number" &&
    typeof entry.winRate === "number"
  );
}

function isDateString(value: unknown): value is string {
  return (
    typeof value === "string" && !Number.isNaN(new Date(value).getTime())
  );
}

function isSeason(
  value: unknown,
): value is NonNullable<PublicCompetitionSnapshot["season"]> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const season = value as Record<string, unknown>;

  return (
    typeof season.sequence === "number" &&
    typeof season.name === "string" &&
    ["scheduled", "active", "completed"].includes(String(season.status)) &&
    isDateString(season.startsAt) &&
    isDateString(season.endsAt) &&
    typeof season.placementMatches === "number"
  );
}

function isSession(
  value: unknown,
): value is NonNullable<PublicCompetitionSnapshot["nextSession"]> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Record<string, unknown>;

  return (
    typeof session.title === "string" &&
    isDateString(session.startsAt) &&
    isDateString(session.endsAt) &&
    ["scheduled", "live", "cancelled", "completed"].includes(
      String(session.status),
    )
  );
}

export function parsePublicCompetitionSnapshot(
  value: unknown,
): PublicCompetitionSnapshot | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const snapshot = value as Record<string, unknown>;
  const community = snapshot.community as Record<string, unknown> | undefined;
  const service = snapshot.service as Record<string, unknown> | undefined;
  const pool = snapshot.pool as Record<string, unknown> | undefined;

  if (
    snapshot.schemaVersion !== 1 ||
    !isDateString(snapshot.generatedAt) ||
    !community ||
    typeof community.name !== "string" ||
    !service ||
    !["online", "paused", "offline"].includes(
      String(service.availability),
    ) ||
    typeof service.registrationOpen !== "boolean" ||
    typeof service.matchmakingOpen !== "boolean" ||
    (service.maintenanceReason !== null &&
      typeof service.maintenanceReason !== "string") ||
    !pool ||
    typeof pool.waitingPlayers !== "number" ||
    typeof pool.readyChecks !== "number" ||
    typeof pool.activeSquads !== "number" ||
    (snapshot.season !== null && !isSeason(snapshot.season)) ||
    (snapshot.nextSession !== null && !isSession(snapshot.nextSession)) ||
    !Array.isArray(snapshot.seasonalLeaderboard) ||
    !snapshot.seasonalLeaderboard.every(isLeaderboardEntry) ||
    !Array.isArray(snapshot.lifetimeLeaderboard) ||
    !snapshot.lifetimeLeaderboard.every(isLeaderboardEntry)
  ) {
    return null;
  }

  return value as PublicCompetitionSnapshot;
}

export async function readPublicCompetitionState(
  now = new Date(),
): Promise<PublicCompetitionState> {
  try {
    const raw = await readFile(snapshotFile, "utf8");
    const snapshot = parsePublicCompetitionSnapshot(JSON.parse(raw));

    if (!snapshot) {
      return { snapshot: null, stale: true };
    }

    const generatedAt = new Date(snapshot.generatedAt);
    const stale =
      Number.isNaN(generatedAt.getTime()) ||
      now.getTime() - generatedAt.getTime() > maximumSnapshotAgeMs;

    return { snapshot, stale };
  } catch {
    return { snapshot: null, stale: true };
  }
}
