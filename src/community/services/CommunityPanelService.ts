import type { Guild } from "discord.js";

import { CommunityConfig } from "../../constants/community.js";
import { PlayerMapper } from "../../mappers/PlayerMapper.js";
import type { CommunityDataRepository } from "../../repositories/CommunityDataRepository.js";
import { createHelpView } from "../ui/createHelpView.js";
import { createMatchmakingStatusView } from "../ui/createMatchmakingStatusView.js";
import { createPublicLeaderboardView } from "../ui/createPublicLeaderboardView.js";
import { createTicketLauncherView } from "../ui/createTicketLauncherView.js";
import type { CommunityPanelPublisher } from "./CommunityPanelPublisher.js";
import type { ManagedCommunityChannelResolver } from "./ManagedCommunityChannelResolver.js";

export class CommunityPanelService {
  public constructor(
    private readonly data: CommunityDataRepository,
    private readonly publisher: CommunityPanelPublisher,
    private readonly channels: ManagedCommunityChannelResolver,
  ) {}

  public async synchronizeStaticPanels(guild: Guild): Promise<void> {
    const [help, ticketLauncher] = await Promise.all([
      this.channels.resolveTextChannel(guild, "help"),
      this.channels.resolveTextChannel(guild, "openTicket"),
    ]);

    await Promise.all([
      help
        ? this.publisher.publish(help, "help", createHelpView())
        : Promise.resolve(),
      ticketLauncher
        ? this.publisher.publish(
            ticketLauncher,
            "ticket_launcher",
            createTicketLauncherView(),
          )
        : Promise.resolve(),
    ]);
  }

  public async synchronizeLeaderboard(guild: Guild): Promise<void> {
    const channel = await this.channels.resolveTextChannel(
      guild,
      "leaderboard",
    );

    if (!channel) {
      return;
    }

    const players = await this.data.findHighestRated(
      CommunityConfig.leaderboardLimit,
    );

    await this.publisher.publish(
      channel,
      "leaderboard",
      createPublicLeaderboardView(
        players.map((player) => PlayerMapper.toDto(player)),
        new Date(),
      ),
    );
  }

  public async synchronizeMatchmakingStatus(guild: Guild): Promise<void> {
    const channel = await this.channels.resolveTextChannel(
      guild,
      "matchmakingStatus",
    );

    if (!channel) {
      return;
    }

    const status = await this.data.getMatchmakingStatus(guild.id);

    await this.publisher.publish(
      channel,
      "matchmaking_status",
      createMatchmakingStatusView(status),
    );
  }
}
