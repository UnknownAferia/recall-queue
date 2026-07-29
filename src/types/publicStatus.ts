import type { PublicCompetitionAvailability } from "./publicCompetition.js";

export type PublicStatusCondition = "operational" | "degraded" | "outage";

export interface PublicStatusDay {
  readonly date: string;
  readonly checks: number;
  readonly successfulChecks: number;
}

export interface PublicStatusIncident {
  readonly id: string;
  readonly startedAt: string;
  readonly resolvedAt: string | null;
  readonly title: string;
  readonly impact: "degraded" | "outage";
}

export interface PublicStatusSnapshot {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly condition: PublicStatusCondition;
  readonly services: {
    readonly website: "operational";
    readonly community: "operational";
    readonly core: PublicStatusCondition;
    readonly matchmaking: PublicCompetitionAvailability;
  };
  readonly history: readonly PublicStatusDay[];
  readonly incidents: readonly PublicStatusIncident[];
}
