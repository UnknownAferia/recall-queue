const SquadReadyCheckRoute = "squad:ready-check";
const SquadLifecycleRoute = "squad:lifecycle";
const SquadResultRoute = "squad:result";
const SquadResultEvidenceRoute = "squad:result-evidence";

export type ReadyCheckAction = "accept" | "decline";

export interface ParsedSquadReadyCheckCustomId {
  readonly action: ReadyCheckAction;
  readonly squadId: string;
}

export type SquadLifecycleAction = "complete" | "disband";

export interface ParsedSquadLifecycleCustomId {
  readonly action: SquadLifecycleAction;
  readonly squadId: string;
}

export type SquadResultAction =
  "report-win" | "report-loss" | "confirm" | "dispute";

export interface ParsedSquadResultCustomId {
  readonly action: SquadResultAction;
  readonly squadId: string;
}

export interface ParsedSquadResultEvidenceCustomId {
  readonly outcome: "win" | "loss";
  readonly squadId: string;
}

export const CustomIds = Object.freeze({
  buttons: {
    mainMenu: {
      profile: "main-menu:profile",
      queue: "main-menu:queue",
      matchHistory: "main-menu:match-history",
      leaderboard: "main-menu:leaderboard",
      preferences: "main-menu:preferences",
    },

    queue: {
      join: "queue:join",
      leave: "queue:leave",
      refresh: "queue:refresh",
    },

    serverSetup: {
      refresh: "server-setup:refresh",
      apply: "server-setup:apply",
    },

    squad: {
      readyCheck: {
        route: SquadReadyCheckRoute,
        accept: (squadId: string) =>
          `${SquadReadyCheckRoute}:accept:${squadId}`,
        decline: (squadId: string) =>
          `${SquadReadyCheckRoute}:decline:${squadId}`,
      },
      lifecycle: {
        route: SquadLifecycleRoute,
        complete: (squadId: string) =>
          `${SquadLifecycleRoute}:complete:${squadId}`,
        disband: (squadId: string) =>
          `${SquadLifecycleRoute}:disband:${squadId}`,
      },
      result: {
        route: SquadResultRoute,
        reportWin: (squadId: string) =>
          `${SquadResultRoute}:report-win:${squadId}`,
        reportLoss: (squadId: string) =>
          `${SquadResultRoute}:report-loss:${squadId}`,
        confirm: (squadId: string) => `${SquadResultRoute}:confirm:${squadId}`,
        dispute: (squadId: string) => `${SquadResultRoute}:dispute:${squadId}`,
      },
    },

    navigation: {
      mainMenu: "navigation:main-menu",
    },
  },

  selectMenus: {
    rolePreferences: {
      primary: "preferences:roles:primary",
      secondary: "preferences:roles:secondary",
      avoided: "preferences:roles:avoided",
    },
  },

  modals: {
    registerPlayer: "player:register",
    squadResultEvidence: {
      route: SquadResultEvidenceRoute,
      submit: (squadId: string, outcome: "win" | "loss") =>
        `${SquadResultEvidenceRoute}:${outcome}:${squadId}`,
    },
  },

  inputs: {
    registerPlayer: {
      ign: "player:register:ign",
      playerId: "player:register:player-id",
      serverId: "player:register:server-id",
    },
    squadResultEvidence: {
      screenshot: "squad:result-evidence:screenshot",
    },
  },
});

export function parseSquadReadyCheckCustomId(
  customId: string,
): ParsedSquadReadyCheckCustomId | null {
  const match = customId.match(
    /^squad:ready-check:(accept|decline):([a-f\d]{24})$/i,
  );

  if (!match) {
    return null;
  }

  return {
    action: match[1]!.toLowerCase() as ReadyCheckAction,
    squadId: match[2]!.toLowerCase(),
  };
}

export function parseSquadLifecycleCustomId(
  customId: string,
): ParsedSquadLifecycleCustomId | null {
  const match = customId.match(
    /^squad:lifecycle:(complete|disband):([a-f\d]{24})$/i,
  );

  if (!match) {
    return null;
  }

  return {
    action: match[1]!.toLowerCase() as SquadLifecycleAction,
    squadId: match[2]!.toLowerCase(),
  };
}

export function parseSquadResultCustomId(
  customId: string,
): ParsedSquadResultCustomId | null {
  const match = customId.match(
    /^squad:result:(report-win|report-loss|confirm|dispute):([a-f\d]{24})$/i,
  );

  if (!match) {
    return null;
  }

  return {
    action: match[1]!.toLowerCase() as SquadResultAction,
    squadId: match[2]!.toLowerCase(),
  };
}

export function parseSquadResultEvidenceCustomId(
  customId: string,
): ParsedSquadResultEvidenceCustomId | null {
  const match = customId.match(
    /^squad:result-evidence:(win|loss):([a-f\d]{24})$/i,
  );

  if (!match) {
    return null;
  }

  return {
    outcome: match[1]!.toLowerCase() as "win" | "loss",
    squadId: match[2]!.toLowerCase(),
  };
}
