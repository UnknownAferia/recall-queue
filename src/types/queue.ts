export type QueueStatus = "open" | "locked";

export interface QueueEntry {
  discordId: string;
  joinedAt: Date;
}

export interface MatchmakingQueue {
  guildId: string;
  status: QueueStatus;
  maximumPlayers: number;
  entries: QueueEntry[];
  createdAt: Date;
  updatedAt: Date;
}