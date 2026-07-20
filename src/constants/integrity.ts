export const IntegritySanctionActions = [
  "none",
  "misleading_evidence",
  "deliberate_fraud",
] as const;

export type IntegritySanctionAction =
  (typeof IntegritySanctionActions)[number];

export const IntegrityConfig = Object.freeze({
  maximumLevel: 3,
  levelDecayIntervalMs: 30 * 24 * 60 * 60 * 1_000,
  misleadingEvidence: {
    behaviorScoreLoss: [15, 20, 25] as const,
    cooldownMs: [
      24 * 60 * 60 * 1_000,
      3 * 24 * 60 * 60 * 1_000,
      7 * 24 * 60 * 60 * 1_000,
    ] as const,
  },
  deliberateFraud: {
    behaviorScoreLoss: [30, 40, 50] as const,
    cooldownMs: [
      7 * 24 * 60 * 60 * 1_000,
      14 * 24 * 60 * 60 * 1_000,
      30 * 24 * 60 * 60 * 1_000,
    ] as const,
  },
});
