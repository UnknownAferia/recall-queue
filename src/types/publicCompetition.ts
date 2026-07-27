export type PublicCompetitionAvailability = "online" | "paused" | "offline";

export interface PublicCompetitionLeaderboardEntry {
  readonly rank: number;
  readonly ign: string;
  readonly rsr: number;
  readonly division: string;
  readonly matchesPlayed: number;
  readonly wins: number;
  readonly winRate: number;
}

export interface PublicCompetitionSeason {
  readonly sequence: number;
  readonly name: string;
  readonly status: "scheduled" | "active" | "completed";
  readonly startsAt: string;
  readonly endsAt: string;
  readonly placementMatches: number;
}

export interface PublicCompetitionSnapshot {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly community: {
    readonly name: string;
  };
  readonly service: {
    readonly availability: PublicCompetitionAvailability;
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
  readonly season: PublicCompetitionSeason | null;
  readonly seasonalLeaderboard: readonly PublicCompetitionLeaderboardEntry[];
  readonly lifetimeLeaderboard: readonly PublicCompetitionLeaderboardEntry[];
}
