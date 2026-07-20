export const ResultEvidenceConfig = Object.freeze({
  maximumFileSizeBytes: 10 * 1_024 * 1_024,
  acceptedContentTypes: ["image/jpeg", "image/png", "image/webp"] as const,
});

export type ResultEvidenceContentType =
  (typeof ResultEvidenceConfig.acceptedContentTypes)[number];
