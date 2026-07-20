import { Client, GatewayIntentBits } from "discord.js";

import { CommunityConfig } from "../constants/community.js";
import { CommunityDataRepository } from "../repositories/CommunityDataRepository.js";
import { CommunityPanelRepository } from "../repositories/CommunityPanelRepository.js";
import { SupportTicketRepository } from "../repositories/SupportTicketRepository.js";
import { ServiceHeartbeatService } from "../services/ServiceHeartbeatService.js";
import { CommunityPanelPublisher } from "./services/CommunityPanelPublisher.js";
import { CommunityPanelService } from "./services/CommunityPanelService.js";
import { ManagedCommunityChannelResolver } from "./services/ManagedCommunityChannelResolver.js";
import { TicketService } from "./services/TicketService.js";

export class CommunityClient extends Client {
  public readonly panels: CommunityPanelService;
  public readonly tickets: TicketService;
  public readonly heartbeat: ServiceHeartbeatService;

  public constructor() {
    super({ intents: [GatewayIntentBits.Guilds] });

    const channels = new ManagedCommunityChannelResolver();
    const panelRepository = new CommunityPanelRepository();

    this.panels = new CommunityPanelService(
      new CommunityDataRepository({
        coreOfflineAfterMs: CommunityConfig.heartbeatOfflineAfterMs,
      }),
      new CommunityPanelPublisher(panelRepository),
      channels,
    );
    this.tickets = new TicketService(new SupportTicketRepository(), channels);
    this.heartbeat = new ServiceHeartbeatService("community");
  }
}
