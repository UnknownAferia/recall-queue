import { readFile } from "node:fs/promises";

export interface ControlSnapshot {
  readonly schemaVersion: 2;
  readonly generatedAt: string;
  readonly communityName: string;
  readonly services: {
    readonly core: {
      readonly status: "operational" | "unavailable";
      readonly heartbeatAt: string | null;
    };
    readonly community: {
      readonly status: "operational" | "unavailable";
      readonly heartbeatAt: string | null;
    };
  };
  readonly access: {
    readonly registrationOpen: boolean;
    readonly matchmakingOpen: boolean;
    readonly maintenanceReason: string | null;
  };
  readonly players: {
    readonly registered: number;
    readonly verified: number;
    readonly pendingVerification: number;
    readonly rejectedVerification: number;
    readonly pendingOlderThan48Hours: number;
    readonly verificationRate: number;
  };
  readonly queue: {
    readonly waitingPlayers: number;
    readonly readyChecks: number;
    readonly activeSquads: number;
    readonly pendingResults: number;
    readonly disputedResults: number;
    readonly nextSession: {
      readonly title: string;
      readonly startsAt: string;
      readonly endsAt: string;
      readonly status: "scheduled" | "live";
    } | null;
  };
  readonly moderation: {
    readonly openReports: number;
    readonly pendingCases: number;
    readonly openTickets: number;
  };
  readonly trends: {
    readonly periodDays: 7;
    readonly registrations: TrendComparison;
    readonly verificationSubmissions: TrendComparison;
    readonly verificationApprovals: TrendComparison;
    readonly squadsFormed: TrendComparison;
    readonly verifiedResults: TrendComparison;
    readonly reportsOpened: TrendComparison;
    readonly ticketsOpened: TrendComparison;
  };
  readonly website: {
    readonly periodDays: number;
    readonly pageViews: number;
    readonly discordClicks: number;
    readonly pageToDiscordRate: number;
    readonly onboardingToDiscordRate: number;
  } | null;
}

interface TrendComparison {
  readonly current: number;
  readonly previous: number;
}

export interface ControlSnapshotState {
  readonly snapshot: ControlSnapshot | null;
  readonly stale: boolean;
}

const snapshotFile = "/app/public-data/control.json";
const maximumSnapshotAgeMs = 10 * 60 * 1_000;

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isPercentage(value: unknown): value is number {
  return isCount(value) && Number(value) <= 100;
}

function isDateString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function isServiceState(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const service = value as Record<string, unknown>;

  return (
    ["operational", "unavailable"].includes(String(service.status)) &&
    (service.heartbeatAt === null || isDateString(service.heartbeatAt))
  );
}

function isTrendComparison(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const comparison = value as Record<string, unknown>;
  return isCount(comparison.current) && isCount(comparison.previous);
}

function isNextSession(value: unknown): boolean {
  if (value === null) {
    return true;
  }

  if (typeof value !== "object") {
    return false;
  }

  const session = value as Record<string, unknown>;
  return (
    typeof session.title === "string" &&
    isDateString(session.startsAt) &&
    isDateString(session.endsAt) &&
    ["scheduled", "live"].includes(String(session.status))
  );
}

export function parseControlSnapshot(value: unknown): ControlSnapshot | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const snapshot = value as Record<string, unknown>;
  const services = snapshot.services as Record<string, unknown> | undefined;
  const access = snapshot.access as Record<string, unknown> | undefined;
  const players = snapshot.players as Record<string, unknown> | undefined;
  const queue = snapshot.queue as Record<string, unknown> | undefined;
  const moderation = snapshot.moderation as Record<string, unknown> | undefined;
  const trends = snapshot.trends as Record<string, unknown> | undefined;
  const website = snapshot.website as
    Record<string, unknown> | null | undefined;

  if (
    snapshot.schemaVersion !== 2 ||
    !isDateString(snapshot.generatedAt) ||
    typeof snapshot.communityName !== "string" ||
    !services ||
    !isServiceState(services.core) ||
    !isServiceState(services.community) ||
    !access ||
    typeof access.registrationOpen !== "boolean" ||
    typeof access.matchmakingOpen !== "boolean" ||
    (access.maintenanceReason !== null &&
      typeof access.maintenanceReason !== "string") ||
    !players ||
    !isCount(players.registered) ||
    !isCount(players.verified) ||
    !isCount(players.pendingVerification) ||
    !isCount(players.rejectedVerification) ||
    !isCount(players.pendingOlderThan48Hours) ||
    !isPercentage(players.verificationRate) ||
    !queue ||
    !isCount(queue.waitingPlayers) ||
    !isCount(queue.readyChecks) ||
    !isCount(queue.activeSquads) ||
    !isCount(queue.pendingResults) ||
    !isCount(queue.disputedResults) ||
    !isNextSession(queue.nextSession) ||
    !moderation ||
    !isCount(moderation.openReports) ||
    !isCount(moderation.pendingCases) ||
    !isCount(moderation.openTickets) ||
    !trends ||
    trends.periodDays !== 7 ||
    !isTrendComparison(trends.registrations) ||
    !isTrendComparison(trends.verificationSubmissions) ||
    !isTrendComparison(trends.verificationApprovals) ||
    !isTrendComparison(trends.squadsFormed) ||
    !isTrendComparison(trends.verifiedResults) ||
    !isTrendComparison(trends.reportsOpened) ||
    !isTrendComparison(trends.ticketsOpened) ||
    (website !== null &&
      (typeof website !== "object" ||
        website === undefined ||
        !isCount(website.periodDays) ||
        !isCount(website.pageViews) ||
        !isCount(website.discordClicks) ||
        !isPercentage(website.pageToDiscordRate) ||
        !isPercentage(website.onboardingToDiscordRate)))
  ) {
    return null;
  }

  return value as ControlSnapshot;
}

export async function readControlSnapshot(
  now = new Date(),
): Promise<ControlSnapshotState> {
  try {
    const parsed: unknown = JSON.parse(await readFile(snapshotFile, "utf8"));
    const snapshot = parseControlSnapshot(parsed);

    if (!snapshot) {
      return { snapshot: null, stale: true };
    }

    return {
      snapshot,
      stale:
        now.getTime() - new Date(snapshot.generatedAt).getTime() >
        maximumSnapshotAgeMs,
    };
  } catch {
    return { snapshot: null, stale: true };
  }
}
