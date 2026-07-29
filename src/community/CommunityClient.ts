import { Client, GatewayIntentBits } from "discord.js";

import { CommunityConfig } from "../constants/community.js";
import { CommunityDataRepository } from "../repositories/CommunityDataRepository.js";
import { CommunityPanelRepository } from "../repositories/CommunityPanelRepository.js";
import { SupportTicketRepository } from "../repositories/SupportTicketRepository.js";
import { CommunityModerationRepository } from "../repositories/CommunityModerationRepository.js";
import { ServiceHeartbeatService } from "../services/ServiceHeartbeatService.js";
import { CommunityPanelPublisher } from "./services/CommunityPanelPublisher.js";
import { CommunityPanelService } from "./services/CommunityPanelService.js";
import { ManagedCommunityChannelResolver } from "./services/ManagedCommunityChannelResolver.js";
import { TicketService } from "./services/TicketService.js";
import { CommunityAutomodService } from "./services/CommunityAutomodService.js";
import { CommunityModerationService } from "./services/CommunityModerationService.js";
import { CommunityReportService } from "./services/CommunityReportService.js";
import { SeasonRepository } from "../repositories/SeasonRepository.js";
import { SeasonService } from "../services/SeasonService.js";
import { MongoTransactionRunner } from "../database/MongoTransactionRunner.js";
import { PlayerRepository } from "../repositories/PlayerRepository.js";
import { PlayerVerificationRepository } from "../repositories/PlayerVerificationRepository.js";
import { MemberOnboardingRepository } from "../repositories/MemberOnboardingRepository.js";
import { OnboardingAudienceExclusionRepository } from "../repositories/OnboardingAudienceExclusionRepository.js";
import { OperationalControlService } from "../services/OperationalControlService.js";
import { PlayerService } from "../services/PlayerService.js";
import { PlayerVerificationEvidenceService } from "../services/PlayerVerificationEvidenceService.js";
import { PlayerVerificationService } from "../services/PlayerVerificationService.js";
import { GuildAccessService } from "../services/GuildAccessService.js";
import { CommunityOnboardingService } from "./services/CommunityOnboardingService.js";
import { QueueActivationRepository } from "../repositories/QueueActivationRepository.js";
import { QueueActivationService } from "./services/QueueActivationService.js";
import { PublicCompetitionSnapshotService } from "./services/PublicCompetitionSnapshotService.js";
import { WebsiteAnalyticsService } from "./services/WebsiteAnalyticsService.js";
import { ControlDataRepository } from "../repositories/ControlDataRepository.js";
import { ControlSnapshotService } from "./services/ControlSnapshotService.js";
import { PublicStatusSnapshotService } from "./services/PublicStatusSnapshotService.js";
import { ScrimListingRepository } from "../repositories/ScrimListingRepository.js";
import { ScrimService } from "./services/ScrimService.js";
import { ControlOperationsApi } from "./services/ControlOperationsApi.js";

export class CommunityClient extends Client {
  public readonly panels: CommunityPanelService;
  public readonly tickets: TicketService;
  public readonly heartbeat: ServiceHeartbeatService;
  public readonly moderation: CommunityModerationService;
  public readonly reports: CommunityReportService;
  public readonly automod: CommunityAutomodService;
  public readonly player: PlayerService;
  public readonly playerVerification: PlayerVerificationService;
  public readonly guildAccess: GuildAccessService;
  public readonly onboarding: CommunityOnboardingService;
  public readonly activation: QueueActivationService;
  public readonly publicCompetition: PublicCompetitionSnapshotService;
  public readonly controlSnapshot: ControlSnapshotService;
  public readonly publicStatus: PublicStatusSnapshotService;
  public readonly scrims: ScrimService;
  public readonly controlOperations: ControlOperationsApi;
  public readonly websiteAnalytics: WebsiteAnalyticsService;

  public constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    const channels = new ManagedCommunityChannelResolver();
    const panelRepository = new CommunityPanelRepository();
    const panelPublisher = new CommunityPanelPublisher(panelRepository);
    const moderationRepository = new CommunityModerationRepository();
    const playerRepository = new PlayerRepository();
    const playerVerificationRepository = new PlayerVerificationRepository();
    const playerVerificationEvidence = new PlayerVerificationEvidenceService();
    const transactionRunner = new MongoTransactionRunner();
    const communityDataRepository = new CommunityDataRepository({
      coreOfflineAfterMs: CommunityConfig.heartbeatOfflineAfterMs,
    });
    const seasonService = new SeasonService(
      new SeasonRepository(),
      transactionRunner,
    );

    this.player = new PlayerService(
      playerRepository,
      new OperationalControlService(),
    );
    this.playerVerification = new PlayerVerificationService(
      playerVerificationRepository,
      playerRepository,
      transactionRunner,
      playerVerificationEvidence,
    );
    this.guildAccess = new GuildAccessService();
    this.onboarding = new CommunityOnboardingService(
      new MemberOnboardingRepository(),
      this.player,
      playerVerificationRepository,
      new OnboardingAudienceExclusionRepository(),
      playerVerificationEvidence,
      channels,
    );
    this.activation = new QueueActivationService(
      new QueueActivationRepository(),
      channels,
    );

    this.panels = new CommunityPanelService(
      communityDataRepository,
      panelPublisher,
      channels,
      seasonService,
    );
    this.websiteAnalytics = new WebsiteAnalyticsService();
    this.publicCompetition = new PublicCompetitionSnapshotService(
      communityDataRepository,
      seasonService,
    );
    this.controlSnapshot = new ControlSnapshotService(
      communityDataRepository,
      new ControlDataRepository(),
      this.websiteAnalytics,
    );
    this.publicStatus = new PublicStatusSnapshotService();
    this.scrims = new ScrimService(new ScrimListingRepository());
    this.controlOperations = new ControlOperationsApi(this);
    this.tickets = new TicketService(new SupportTicketRepository(), channels);
    this.moderation = new CommunityModerationService(
      moderationRepository,
      channels,
    );
    this.reports = new CommunityReportService(
      moderationRepository,
      channels,
      panelPublisher,
    );
    this.automod = new CommunityAutomodService();
    this.heartbeat = new ServiceHeartbeatService("community");
  }
}
