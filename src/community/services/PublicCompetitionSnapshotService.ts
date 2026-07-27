import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { DivisionResolver } from "../../domain/rating/DivisionResolver.js";
import { PlayerMapper } from "../../mappers/PlayerMapper.js";
import type { CommunityDataRepository } from "../../repositories/CommunityDataRepository.js";
import type { SeasonService } from "../../services/SeasonService.js";
import type {
  PublicCompetitionLeaderboardEntry,
  PublicCompetitionSnapshot,
} from "../../types/publicCompetition.js";

const SnapshotFileName = "competition.json";

function calculateWinRate(wins: number, matchesPlayed: number): number {
  if (matchesPlayed === 0) {
    return 0;
  }

  return Number(((wins / matchesPlayed) * 100).toFixed(1));
}

export class PublicCompetitionSnapshotService {
  private readonly divisionResolver = new DivisionResolver();

  public constructor(
    private readonly data: Pick<
      CommunityDataRepository,
      "findHighestRated" | "getMatchmakingStatus"
    >,
    private readonly seasons: Pick<SeasonService, "getLeaderboard">,
    private readonly outputDirectory =
      process.env.VORA_PUBLIC_DATA_DIRECTORY?.trim() || null,
  ) {}

  public async publish(
    guildId: string,
    guildName: string,
    now = new Date(),
  ): Promise<PublicCompetitionSnapshot | null> {
    if (!this.outputDirectory) {
      return null;
    }

    const snapshot = await this.create(guildId, guildName, now);
    const target = join(this.outputDirectory, SnapshotFileName);
    const temporary = join(
      this.outputDirectory,
      `.${SnapshotFileName}.${process.pid}.tmp`,
    );

    await mkdir(this.outputDirectory, { recursive: true });
    await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o644,
    });
    await rename(temporary, target);

    return snapshot;
  }

  public async create(
    guildId: string,
    guildName: string,
    now = new Date(),
  ): Promise<PublicCompetitionSnapshot> {
    const [status, lifetimePlayers, seasonal] = await Promise.all([
      this.data.getMatchmakingStatus(guildId, now),
      this.data.findHighestRated(10),
      this.seasons.getLeaderboard(10),
    ]);
    const availability = !status.coreOnline
      ? "offline"
      : status.queueStatus !== "open" || !status.matchmakingOpen
        ? "paused"
        : "online";

    return {
      schemaVersion: 1,
      generatedAt: now.toISOString(),
      community: {
        name: guildName.trim() || "Vora",
      },
      service: {
        availability,
        registrationOpen: status.registrationOpen,
        matchmakingOpen: status.matchmakingOpen,
        maintenanceReason: status.maintenanceReason,
      },
      pool: {
        waitingPlayers: status.queuedPlayers,
        readyChecks: status.readyChecks,
        activeSquads: status.activeSquads,
      },
      nextSession: status.nextQueueSession
        ? {
            title: status.nextQueueSession.title,
            startsAt: status.nextQueueSession.startsAt.toISOString(),
            endsAt: status.nextQueueSession.endsAt.toISOString(),
            status: status.nextQueueSession.status,
          }
        : null,
      season: seasonal
        ? {
            sequence: seasonal.season.sequence,
            name: seasonal.season.name,
            status: seasonal.season.status,
            startsAt: seasonal.season.startsAt.toISOString(),
            endsAt: seasonal.season.endsAt.toISOString(),
            placementMatches: seasonal.season.rules.placementMatches,
          }
        : null,
      seasonalLeaderboard:
        seasonal?.entries.map((entry) =>
          this.toLeaderboardEntry({
            rank: entry.rank,
            ign: entry.ign,
            rsr: entry.currentRsr,
            matchesPlayed: entry.matchesPlayed,
            wins: entry.wins,
          }),
        ) ?? [],
      lifetimeLeaderboard: lifetimePlayers.map((player, index) => {
        const dto = PlayerMapper.toDto(player);

        return this.toLeaderboardEntry({
          rank: index + 1,
          ign: dto.game.ign,
          rsr: dto.rating.rsr,
          matchesPlayed: dto.statistics.matchesPlayed,
          wins: dto.statistics.wins,
        });
      }),
    };
  }

  private toLeaderboardEntry(input: {
    readonly rank: number;
    readonly ign: string;
    readonly rsr: number;
    readonly matchesPlayed: number;
    readonly wins: number;
  }): PublicCompetitionLeaderboardEntry {
    const standing = this.divisionResolver.resolve(
      input.rsr,
      input.matchesPlayed,
    );

    return {
      rank: input.rank,
      ign: input.ign,
      rsr: input.rsr,
      division:
        standing.state === "ranked" ? standing.division.name : "Placement",
      matchesPlayed: input.matchesPlayed,
      wins: input.wins,
      winRate: calculateWinRate(input.wins, input.matchesPlayed),
    };
  }
}
