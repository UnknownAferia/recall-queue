import { existsSync } from "node:fs";

import type { ContainerBuilder, Guild } from "discord.js";

import { BrandAssets, type BrandAsset } from "../../config/brand.js";
import {
  CommunityConfig,
  type CommunityPanelKind,
} from "../../constants/community.js";
import { PlayerMapper } from "../../mappers/PlayerMapper.js";
import type { CommunityDataRepository } from "../../repositories/CommunityDataRepository.js";
import { createAnnouncementsView } from "../ui/createAnnouncementsView.js";
import { createAlphaLaunchAnnouncementView } from "../ui/createAlphaLaunchAnnouncementView.js";
import { createHelpView } from "../ui/createHelpView.js";
import { createHowVoraWorksView } from "../ui/createHowVoraWorksView.js";
import { createMatchmakingStatusView } from "../ui/createMatchmakingStatusView.js";
import { createPublicLeaderboardView } from "../ui/createPublicLeaderboardView.js";
import { createRulesView } from "../ui/createRulesView.js";
import { createTicketLauncherView } from "../ui/createTicketLauncherView.js";
import { createVoraCommandsView } from "../ui/createVoraCommandsView.js";
import { createWelcomeView } from "../ui/createWelcomeView.js";
import type { CommunityPanelPublisher } from "./CommunityPanelPublisher.js";
import type { ManagedCommunityChannelResolver } from "./ManagedCommunityChannelResolver.js";
import { createRegisterView } from "../ui/createRegisterView.js";
import type { SeasonService } from "../../services/SeasonService.js";

interface StaticPanelDefinition {
  readonly channelKey: string;
  readonly kind: CommunityPanelKind;
  readonly createView: (attachmentName?: string) => ContainerBuilder;
  readonly asset?: BrandAsset;
}

export interface StaticPanelSynchronizationResult {
  readonly published: readonly CommunityPanelKind[];
  readonly missingChannelKeys: readonly string[];
}

export interface AnnouncementPublicationResult {
  readonly channelId: string;
  readonly messageId: string;
}

const StaticPanelDefinitions: readonly StaticPanelDefinition[] = [
  {
    channelKey: "welcome",
    kind: "welcome",
    createView: createWelcomeView,
    asset: BrandAssets.banner,
  },
  {
    channelKey: "rules",
    kind: "rules",
    createView: createRulesView,
    asset: BrandAssets.panelIcons.rules,
  },
  {
    channelKey: "announcements",
    kind: "announcements",
    createView: createAnnouncementsView,
    asset: BrandAssets.panelIcons.announcements,
  },
  {
    channelKey: "howVoraWorks",
    kind: "how_vora_works",
    createView: createHowVoraWorksView,
    asset: BrandAssets.panelIcons.howVoraWorks,
  },
  {
    channelKey: "register",
    kind: "register",
    createView: createRegisterView,
    asset: BrandAssets.panelIcons.register,
  },
  {
    channelKey: "voraCommands",
    kind: "vora_commands",
    createView: createVoraCommandsView,
    asset: BrandAssets.panelIcons.commands,
  },
  {
    channelKey: "help",
    kind: "help",
    createView: createHelpView,
    asset: BrandAssets.panelIcons.help,
  },
  {
    channelKey: "openTicket",
    kind: "ticket_launcher",
    createView: createTicketLauncherView,
    asset: BrandAssets.panelIcons.tickets,
  },
];

export class CommunityPanelService {
  public constructor(
    private readonly data: CommunityDataRepository,
    private readonly publisher: CommunityPanelPublisher,
    private readonly channels: ManagedCommunityChannelResolver,
    private readonly seasons: Pick<
      SeasonService,
      "getLeaderboard"
    > | null = null,
  ) {}

  public async synchronizeStaticPanels(
    guild: Guild,
  ): Promise<StaticPanelSynchronizationResult> {
    const results = await Promise.all(
      StaticPanelDefinitions.map(async (definition) => {
        const channel = await this.channels.resolveTextChannel(
          guild,
          definition.channelKey,
        );

        if (!channel) {
          return { definition, published: false } as const;
        }

        const asset =
          definition.asset && existsSync(definition.asset.filePath)
            ? definition.asset
            : undefined;

        await this.publisher.publish(
          channel,
          definition.kind,
          definition.createView(asset?.attachmentName),
          asset,
        );
        return { definition, published: true } as const;
      }),
    );

    return {
      published: results
        .filter((result) => result.published)
        .map((result) => result.definition.kind),
      missingChannelKeys: results
        .filter((result) => !result.published)
        .map((result) => result.definition.channelKey),
    };
  }

  public async synchronizeLeaderboard(guild: Guild): Promise<void> {
    const channel = await this.channels.resolveTextChannel(
      guild,
      "leaderboard",
    );

    if (!channel) {
      return;
    }

    const [players, seasonal] = await Promise.all([
      this.data.findHighestRated(CommunityConfig.leaderboardLimit),
      this.seasons?.getLeaderboard(CommunityConfig.leaderboardLimit) ?? null,
    ]);

    const asset = existsSync(BrandAssets.panelIcons.leaderboard.filePath)
      ? BrandAssets.panelIcons.leaderboard
      : undefined;

    await this.publisher.publish(
      channel,
      "leaderboard",
      createPublicLeaderboardView(
        players.map((player) => PlayerMapper.toDto(player)),
        new Date(),
        seasonal,
        asset?.attachmentName,
      ),
      asset,
    );
  }

  public async publishAlphaLaunchAnnouncement(
    guild: Guild,
  ): Promise<AnnouncementPublicationResult | null> {
    const channel = await this.channels.resolveTextChannel(
      guild,
      "announcements",
    );

    if (!channel) {
      return null;
    }

    const asset = existsSync(BrandAssets.alphaBanner.filePath)
      ? BrandAssets.alphaBanner
      : undefined;
    const messageId = await this.publisher.publish(
      channel,
      "alpha_launch_announcement",
      createAlphaLaunchAnnouncementView(asset?.attachmentName),
      asset,
    );

    return { channelId: channel.id, messageId };
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

    const asset = existsSync(
      BrandAssets.panelIcons.matchmakingStatus.filePath,
    )
      ? BrandAssets.panelIcons.matchmakingStatus
      : undefined;

    await this.publisher.publish(
      channel,
      "matchmaking_status",
      createMatchmakingStatusView(status, asset?.attachmentName),
      asset,
    );
  }
}
