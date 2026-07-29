import { readFile } from "node:fs/promises";

export interface ControlSnapshot {
  readonly schemaVersion: 1;
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
    readonly verificationRate: number;
  };
  readonly queue: {
    readonly waitingPlayers: number;
    readonly readyChecks: number;
    readonly activeSquads: number;
    readonly pendingResults: number;
    readonly disputedResults: number;
  };
  readonly moderation: {
    readonly openReports: number;
    readonly pendingCases: number;
    readonly openTickets: number;
  };
  readonly website: {
    readonly periodDays: number;
    readonly pageViews: number;
    readonly discordClicks: number;
    readonly pageToDiscordRate: number;
    readonly onboardingToDiscordRate: number;
  } | null;
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
  const website = snapshot.website as
    Record<string, unknown> | null | undefined;

  if (
    snapshot.schemaVersion !== 1 ||
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
    !isPercentage(players.verificationRate) ||
    !queue ||
    !isCount(queue.waitingPlayers) ||
    !isCount(queue.readyChecks) ||
    !isCount(queue.activeSquads) ||
    !isCount(queue.pendingResults) ||
    !isCount(queue.disputedResults) ||
    !moderation ||
    !isCount(moderation.openReports) ||
    !isCount(moderation.pendingCases) ||
    !isCount(moderation.openTickets) ||
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
