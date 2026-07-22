export type QueueDisciplineReason =
  | "decline"
  | "timeout"
  | "result_report_timeout"
  | "result_confirmation_timeout";

export interface QueueDisciplinePenalty {
  readonly reason: QueueDisciplineReason;
  readonly level: number;
  readonly behaviorScoreLoss: number;
  readonly cooldownMs: number;
  readonly bannedUntil: Date;
  readonly appliedAt: Date;
}

export interface QueueDisciplineState {
  readonly level: number;
  readonly lastPenaltyAt: Date | null;
}

const PenaltyRules = Object.freeze({
  decline: { behaviorScoreLoss: 3, cooldownMs: 2 * 60_000 },
  timeout: { behaviorScoreLoss: 5, cooldownMs: 5 * 60_000 },
  result_report_timeout: {
    behaviorScoreLoss: 8,
    cooldownMs: 30 * 60_000,
  },
  result_confirmation_timeout: {
    behaviorScoreLoss: 4,
    cooldownMs: 10 * 60_000,
  },
});

const DisciplineConfig = Object.freeze({
  maximumLevel: 3,
  levelDecayIntervalMs: 24 * 60 * 60_000,
});

export function calculateEffectiveDisciplineLevel(
  state: QueueDisciplineState,
  now = new Date(),
): number {
  const currentLevel = Math.min(
    DisciplineConfig.maximumLevel,
    Math.max(0, Math.trunc(state.level)),
  );

  if (!state.lastPenaltyAt) {
    return 0;
  }

  const elapsedMs = Math.max(0, now.getTime() - state.lastPenaltyAt.getTime());
  const decayedLevels = Math.floor(
    elapsedMs / DisciplineConfig.levelDecayIntervalMs,
  );

  return Math.max(0, currentLevel - decayedLevels);
}

export class QueueDisciplinePolicy {
  public createPenalty(
    reason: QueueDisciplineReason,
    state: QueueDisciplineState,
    now = new Date(),
  ): QueueDisciplinePenalty {
    const rule = PenaltyRules[reason];
    const effectiveLevel = calculateEffectiveDisciplineLevel(state, now);
    const multiplier = 2 ** effectiveLevel;
    const level = Math.min(DisciplineConfig.maximumLevel, effectiveLevel + 1);
    const cooldownMs = rule.cooldownMs * multiplier;

    return {
      reason,
      level,
      behaviorScoreLoss: rule.behaviorScoreLoss + effectiveLevel,
      cooldownMs,
      bannedUntil: new Date(now.getTime() + cooldownMs),
      appliedAt: new Date(now),
    };
  }
}
