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

export class CommunityClient extends Client {
  public readonly panels: CommunityPanelService;
  public readonly tickets: TicketService;
  public readonly heartbeat: ServiceHeartbeatService;
  public readonly moderation: CommunityModerationService;
  public readonly reports: CommunityReportService;
  public readonly automod: CommunityAutomodService;

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

    this.panels = new CommunityPanelService(
      new CommunityDataRepository({
        coreOfflineAfterMs: CommunityConfig.heartbeatOfflineAfterMs,
      }),
      panelPublisher,
      channels,
      new SeasonService(new SeasonRepository(), new MongoTransactionRunner()),
    );
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
