import { TeamFormationEngine } from "../domain/matchmaking/TeamFormationEngine.js";
import { MongoTransactionRunner } from "../database/MongoTransactionRunner.js";
import { SquadConfig } from "../constants/squad.js";
import { PlayerRepository } from "../repositories/PlayerRepository.js";
import { QueueRepository } from "../repositories/QueueRepository.js";
import { SquadRepository } from "../repositories/SquadRepository.js";
import { ModerationAuditRepository } from "../repositories/ModerationAuditRepository.js";
import { PlayerService } from "./PlayerService.js";
import { QueueService } from "./QueueService.js";
import { TeamFormationService } from "./TeamFormationService.js";
import { VerifiedResultProcessor } from "./VerifiedResultProcessor.js";
import { GuildSetupService } from "./GuildSetupService.js";
import { GuildAccessService } from "./GuildAccessService.js";
import { DevelopmentSimulationRepository } from "../repositories/DevelopmentSimulationRepository.js";
import { DevelopmentSimulationService } from "./DevelopmentSimulationService.js";
import { env } from "../config/env.js";
import { QueueVoiceService } from "./QueueVoiceService.js";
import { SquadVoiceService } from "./SquadVoiceService.js";
import { QueueDisciplineService } from "./QueueDisciplineService.js";
import { ReadyCheckExpirationService } from "./ReadyCheckExpirationService.js";
import { DisputeModerationService } from "./DisputeModerationService.js";
import { ResultEvidenceService } from "./ResultEvidenceService.js";
import { ModerationAuditService } from "./ModerationAuditService.js";
import { DivisionRoleService } from "./DivisionRoleService.js";
import { ResultLifecycleExpirationService } from "./ResultLifecycleExpirationService.js";
import { SeasonRepository } from "../repositories/SeasonRepository.js";
import { SeasonProgressionService } from "./SeasonProgressionService.js";
import { SeasonService } from "./SeasonService.js";

export class ServiceContainer {
  public readonly player: PlayerService;
  public readonly queue: QueueService;
  public readonly teamFormation: TeamFormationService;
  public readonly guildSetup: GuildSetupService;
  public readonly guildAccess: GuildAccessService;
  public readonly developmentSimulation: DevelopmentSimulationService;
  public readonly queueVoice: QueueVoiceService;
  public readonly squadVoice: SquadVoiceService;
  public readonly readyCheckExpiration: ReadyCheckExpirationService;
  public readonly disputeModeration: DisputeModerationService;
  public readonly resultEvidence: ResultEvidenceService;
  public readonly moderationAudit: ModerationAuditService;
  public readonly divisionRoles: DivisionRoleService;
  public readonly resultLifecycleExpiration: ResultLifecycleExpirationService;
  public readonly seasons: SeasonService;

  public constructor() {
    const playerRepository = new PlayerRepository();
    const queueRepository = new QueueRepository();
    const squadRepository = new SquadRepository();
    const moderationAuditRepository = new ModerationAuditRepository();
    const seasonRepository = new SeasonRepository();
    const transactionRunner = new MongoTransactionRunner();
    const queueDiscipline = new QueueDisciplineService(playerRepository);
    this.resultLifecycleExpiration = new ResultLifecycleExpirationService(
      squadRepository,
      queueDiscipline,
    );

    this.guildSetup = new GuildSetupService();
    this.guildAccess = new GuildAccessService();
    this.divisionRoles = new DivisionRoleService(playerRepository);
    this.resultEvidence = new ResultEvidenceService();
    this.moderationAudit = new ModerationAuditService(
      moderationAuditRepository,
    );
    this.seasons = new SeasonService(seasonRepository, transactionRunner);
    const seasonProgression = new SeasonProgressionService(seasonRepository);

    this.player = new PlayerService(playerRepository);

    this.queue = new QueueService(
      queueRepository,
      playerRepository,
      squadRepository,
    );
    this.queueVoice = new QueueVoiceService(this.queue);
    this.squadVoice = new SquadVoiceService(squadRepository, this.queueVoice);

    const verifiedResultProcessor = new VerifiedResultProcessor(
      squadRepository,
      playerRepository,
      transactionRunner,
      SquadConfig,
      this.moderationAudit,
      seasonProgression,
    );
    this.disputeModeration = new DisputeModerationService(
      squadRepository,
      verifiedResultProcessor,
    );

    this.teamFormation = new TeamFormationService(
      queueRepository,
      squadRepository,
      this.player,
      new TeamFormationEngine(),
      verifiedResultProcessor,
      queueDiscipline,
    );
    this.readyCheckExpiration = new ReadyCheckExpirationService(
      this.teamFormation,
    );

    this.developmentSimulation = new DevelopmentSimulationService(
      new DevelopmentSimulationRepository(),
      this.player,
      this.teamFormation,
      {
        enabled: env.testModeEnabled,
        databaseName: env.mongodbDatabase,
      },
    );
  }
}
