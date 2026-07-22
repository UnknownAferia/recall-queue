export const PlayerVerificationStatuses = [
  "legacy_verified",
  "pending",
  "verified",
  "rejected",
] as const;

export type PlayerVerificationStatus =
  (typeof PlayerVerificationStatuses)[number];

export const PlayerVerificationDecisions = ["approve", "reject"] as const;

export type PlayerVerificationDecision =
  (typeof PlayerVerificationDecisions)[number];

export const PlayerVerificationConfig = Object.freeze({
  maximumFileSizeBytes: 10 * 1024 * 1024,
  acceptedContentTypes: ["image/png", "image/jpeg", "image/webp"] as const,
  rejectionReasonMinimumLength: 5,
  rejectionReasonMaximumLength: 500,
});

export type PlayerVerificationContentType =
  (typeof PlayerVerificationConfig.acceptedContentTypes)[number];

export function isPlayerVerificationApproved(
  status: PlayerVerificationStatus,
): boolean {
  return status === "verified" || status === "legacy_verified";
}

export function normalizePlayerVerificationStatus(
  status: string | null | undefined,
): PlayerVerificationStatus {
  return PlayerVerificationStatuses.includes(
    status as PlayerVerificationStatus,
  )
    ? (status as PlayerVerificationStatus)
    : "legacy_verified";
}
