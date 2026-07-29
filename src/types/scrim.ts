export type ScrimRegion = "eu" | "na" | "sea" | "other";

export interface ScrimListing {
  guildId: string;
  captainDiscordId: string;
  teamName: string;
  region: ScrimRegion;
  availability: string;
  notes: string | null;
  status: "open" | "closed";
  expiresAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScrimListingSummary {
  readonly id: string;
  readonly captainDiscordId: string;
  readonly teamName: string;
  readonly region: ScrimRegion;
  readonly availability: string;
  readonly notes: string | null;
  readonly expiresAt: Date;
}
