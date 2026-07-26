export const CommunityPanelKinds = [
  "welcome",
  "rules",
  "announcements",
  "release_announcement",
  "alpha_launch_announcement",
  "how_vora_works",
  "vora_commands",
  "leaderboard",
  "matchmaking_status",
  "help",
  "ticket_launcher",
  "register",
  "community_reports",
] as const;

export type CommunityPanelKind = (typeof CommunityPanelKinds)[number];

export const ServiceHeartbeatNames = ["core", "community"] as const;

export type ServiceHeartbeatName = (typeof ServiceHeartbeatNames)[number];

export const CommunityConfig = Object.freeze({
  leaderboardLimit: 10,
  leaderboardRefreshIntervalMs: 5 * 60 * 1_000,
  matchmakingStatusRefreshIntervalMs: 30 * 1_000,
  heartbeatIntervalMs: 20 * 1_000,
  heartbeatOfflineAfterMs: 60 * 1_000,
  ticketCreateLimit: 3,
  ticketCreateWindowMs: 10 * 60 * 1_000,
  ticketCloseLimit: 10,
  ticketCloseWindowMs: 5 * 60 * 1_000,
  ticketDependencyTimeoutMs: 10 * 1_000,
  operationalAuditTimeoutMs: 3 * 1_000,
  ticketTranscriptMaximumMessages: 5_000,
  ticketClosedChannelRetentionMs: 7 * 24 * 60 * 60 * 1_000,
  ticketTranscriptRetentionMs: 365 * 24 * 60 * 60 * 1_000,
  ticketRetentionSweepIntervalMs: 6 * 60 * 60 * 1_000,
  onboardingReminderCooldownMs: 7 * 24 * 60 * 60 * 1_000,
  onboardingReminderBatchSize: 25,
  onboardingMemberCacheMs: 30 * 1_000,
});

export const CommunityCustomIds = Object.freeze({
  ticket: {
    open: "community:ticket:open",
    create: "community:ticket:create",
    close: "community:ticket:close",
    subject: "community:ticket:subject",
    description: "community:ticket:description",
  },
  onboarding: {
    register: "community:onboarding:register",
    verify: "community:onboarding:verify",
    refresh: "community:onboarding:refresh",
    nudge: "community:onboarding:nudge",
    registerModal: "community:onboarding:register:submit",
    verificationModal: "community:onboarding:verification:submit",
    ign: "community:onboarding:register:ign",
    playerId: "community:onboarding:register:player-id",
    serverId: "community:onboarding:register:server-id",
    screenshot: "community:onboarding:verification:screenshot",
  },
  queueActivation: {
    toggleAlerts: "community:queue-activation:toggle-alerts",
    upcomingSessions: "community:queue-activation:upcoming-sessions",
  },
});
