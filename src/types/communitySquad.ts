import type {
  CommunitySquadFoundingStatus,
  CommunitySquadRegion,
} from "../constants/communitySquad.js";
import type { PlayerRole } from "../constants/playerRoles.js";

export interface CommunitySquadMember {
  discordId: string;
  joinedAt: Date;
}

export interface CommunitySquadFounding {
  status: CommunitySquadFoundingStatus;
  appliedAt: Date | null;
  reviewedAt: Date | null;
  reviewedByDiscordId: string | null;
  rejectionReason: string | null;
}

export interface CommunitySquad {
  guildId: string;
  name: string;
  normalizedName: string;
  tag: string;
  description: string | null;
  region: CommunitySquadRegion;
  inviteCode: string;
  captainDiscordId: string;
  members: CommunitySquadMember[];
  recruitingRoles: PlayerRole[];
  founding: CommunitySquadFounding;
  status: "active" | "archived";
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunitySquadSummary {
  readonly id: string;
  readonly guildId: string;
  readonly name: string;
  readonly tag: string;
  readonly description: string | null;
  readonly region: CommunitySquadRegion;
  readonly inviteCode: string;
  readonly captainDiscordId: string;
  readonly members: readonly CommunitySquadMember[];
  readonly recruitingRoles: readonly PlayerRole[];
  readonly founding: CommunitySquadFounding;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CommunitySquadRosterMember {
  readonly discordId: string;
  readonly ign: string;
  readonly rsr: number;
  readonly primaryRole: PlayerRole | null;
  readonly secondaryRole: PlayerRole | null;
  readonly joinedAt: Date;
  readonly isCaptain: boolean;
}

export interface CommunitySquadDashboard extends CommunitySquadSummary {
  readonly roster: readonly CommunitySquadRosterMember[];
  readonly uncoveredRoles: readonly PlayerRole[];
}

export interface CreateCommunitySquadInput {
  readonly guildId: string;
  readonly captainDiscordId: string;
  readonly name: string;
  readonly tag?: string | null;
  readonly description?: string | null;
  readonly region: CommunitySquadRegion;
}
