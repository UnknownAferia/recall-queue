import type { PlayerRole } from "./playerRoles.js";

export const CommunitySquadRegions = ["eu", "na", "sea", "other"] as const;

export type CommunitySquadRegion = (typeof CommunitySquadRegions)[number];

export const CommunitySquadRegionLabels: Readonly<
  Record<CommunitySquadRegion, string>
> = Object.freeze({
  eu: "Europe",
  na: "North America",
  sea: "Southeast Asia",
  other: "Other",
});

export const CommunitySquadFoundingStatuses = [
  "none",
  "applied",
  "founding",
  "rejected",
] as const;

export type CommunitySquadFoundingStatus =
  (typeof CommunitySquadFoundingStatuses)[number];

export const CommunitySquadConfig = Object.freeze({
  maximumMembers: 15,
  minimumFoundingMembers: 5,
  nameMinimumLength: 2,
  nameMaximumLength: 40,
  tagMinimumLength: 2,
  tagMaximumLength: 5,
  descriptionMaximumLength: 240,
  inviteCodeLength: 8,
  inviteGenerationAttempts: 8,
});

export function normalizeCommunitySquadInviteCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatCommunitySquadInviteCode(value: string): string {
  const normalized = normalizeCommunitySquadInviteCode(value);
  return normalized.length === CommunitySquadConfig.inviteCodeLength
    ? `${normalized.slice(0, 4)}-${normalized.slice(4)}`
    : normalized;
}

export function normalizeCommunitySquadTag(
  value: string | null | undefined,
  name: string,
): string {
  const explicit = (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (explicit.length >= CommunitySquadConfig.tagMinimumLength) {
    return explicit.slice(0, CommunitySquadConfig.tagMaximumLength);
  }

  const words = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  const initials = words.map((word) => word[0]).join("").toUpperCase();
  const compact = words.join("").toUpperCase();
  const generated = (initials.length >= 2 ? initials : compact)
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CommunitySquadConfig.tagMaximumLength);

  return generated.length >= CommunitySquadConfig.tagMinimumLength
    ? generated
    : "VORA";
}

export function normalizeRecruitingRoles(
  roles: readonly PlayerRole[],
): PlayerRole[] {
  return [...new Set(roles)].sort();
}
