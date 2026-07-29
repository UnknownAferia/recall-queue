export interface ControlServiceState {
  readonly status: "operational" | "unavailable";
  readonly heartbeatAt: string | null;
}

export interface ControlWebsiteSnapshot {
  readonly periodDays: number;
  readonly pageViews: number;
  readonly discordClicks: number;
  readonly pageToDiscordRate: number;
  readonly onboardingToDiscordRate: number;
}

export interface ControlTrendComparison {
  readonly current: number;
  readonly previous: number;
}

export interface ControlSnapshot {
  readonly schemaVersion: 2;
  readonly generatedAt: string;
  readonly communityName: string;
  readonly services: {
    readonly core: ControlServiceState;
    readonly community: ControlServiceState;
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
    readonly registrations: ControlTrendComparison;
    readonly verificationSubmissions: ControlTrendComparison;
    readonly verificationApprovals: ControlTrendComparison;
    readonly squadsFormed: ControlTrendComparison;
    readonly verifiedResults: ControlTrendComparison;
    readonly reportsOpened: ControlTrendComparison;
    readonly ticketsOpened: ControlTrendComparison;
  };
  readonly website: ControlWebsiteSnapshot | null;
}
