import type { SquadDto } from "../dto/SquadDto.js";
import { SquadMapper } from "../mappers/SquadMapper.js";
import type { SquadRepository } from "../repositories/SquadRepository.js";
import type { QueueDisciplineService } from "./QueueDisciplineService.js";

export interface ResultLifecycleExpirationResult {
  readonly expiredSquads: readonly SquadDto[];
  readonly penalizedPlayers: number;
}

export class ResultLifecycleExpirationService {
  public constructor(
    private readonly squadRepository: SquadRepository,
    private readonly queueDisciplineService: QueueDisciplineService,
  ) {}

  public async expireOverdueCases(
    now = new Date(),
  ): Promise<ResultLifecycleExpirationResult> {
    const [reportTimeouts, confirmationTimeouts] = await Promise.all([
      this.squadRepository.expireOverdueResultReports(now),
      this.squadRepository.expireOverdueResultConfirmations(now),
    ]);
    const expiredSquads = [...reportTimeouts, ...confirmationTimeouts].map(
      (squad) => SquadMapper.toDto(squad),
    );
    const penalizedCounts = await Promise.all(
      expiredSquads.map((squad) => {
        const incident = squad.lifecycleIncident;

        if (!incident) {
          return 0;
        }

        return this.queueDisciplineService.applyPenalties(
          incident.responsibleDiscordIds,
          incident.reason,
        );
      }),
    );

    return {
      expiredSquads,
      penalizedPlayers: penalizedCounts.reduce(
        (total, count) => total + count,
        0,
      ),
    };
  }
}
