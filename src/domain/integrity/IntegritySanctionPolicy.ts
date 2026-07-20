import {
  IntegrityConfig,
  type IntegritySanctionAction,
} from "../../constants/integrity.js";

export interface IntegrityState {
  readonly level: number;
  readonly lastSanctionAt: Date | null;
}

export interface IntegritySanctionPenalty {
  readonly action: Exclude<IntegritySanctionAction, "none">;
  readonly levelBefore: number;
  readonly levelAfter: number;
  readonly behaviorScoreLoss: number;
  readonly appliedAt: Date;
  readonly bannedUntil: Date;
}

export function calculateEffectiveIntegrityLevel(
  state: IntegrityState,
  now = new Date(),
): number {
  const boundedLevel = Math.max(
    0,
    Math.min(IntegrityConfig.maximumLevel, Math.floor(state.level)),
  );

  if (!state.lastSanctionAt || boundedLevel === 0) {
    return boundedLevel;
  }

  const elapsedMs = Math.max(
    0,
    now.getTime() - state.lastSanctionAt.getTime(),
  );
  const decayedLevels = Math.floor(
    elapsedMs / IntegrityConfig.levelDecayIntervalMs,
  );

  return Math.max(0, boundedLevel - decayedLevels);
}

export class IntegritySanctionPolicy {
  public createPenalty(
    action: Exclude<IntegritySanctionAction, "none">,
    state: IntegrityState,
    now = new Date(),
  ): IntegritySanctionPenalty {
    const levelBefore = calculateEffectiveIntegrityLevel(state, now);
    const levelAfter = Math.min(
      IntegrityConfig.maximumLevel,
      levelBefore + 1,
    );
    const configuration =
      action === "misleading_evidence"
        ? IntegrityConfig.misleadingEvidence
        : IntegrityConfig.deliberateFraud;
    const index = levelAfter - 1;
    const behaviorScoreLoss = configuration.behaviorScoreLoss[index]!;
    const cooldownMs = configuration.cooldownMs[index]!;

    return {
      action,
      levelBefore,
      levelAfter,
      behaviorScoreLoss,
      appliedAt: now,
      bannedUntil: new Date(now.getTime() + cooldownMs),
    };
  }
}
