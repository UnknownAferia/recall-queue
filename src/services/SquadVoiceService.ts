import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  type CategoryChannel,
  type Guild,
  type GuildMember,
  type OverwriteData,
  type VoiceChannel,
} from "discord.js";

import { GuildBlueprint } from "../config/guildBlueprint.js";
import { logger } from "../config/logger.js";
import { isSimulationDiscordId } from "../constants/developmentSimulation.js";
import type { SquadDto } from "../dto/SquadDto.js";
import { SquadMapper } from "../mappers/SquadMapper.js";
import type { SquadRepository } from "../repositories/SquadRepository.js";
import { formatError } from "../utils/formatError.js";
import type { QueueVoiceService } from "./QueueVoiceService.js";
import { SquadVoiceUnavailableError } from "./errors/SquadVoiceUnavailableError.js";

const SquadVoiceChannelPrefix = "🔒｜squad-";
const OpenSquadStatuses = new Set(["active", "result_pending"]);
const StaffRoleKeys = new Set([
  "administrator",
  "moderator",
  "support",
  "developer",
]);

export interface SquadVoiceReconciliationResult {
  readonly categoryAvailable: boolean;
  readonly restoredChannels: number;
  readonly removedChannels: number;
}

export class SquadVoiceService {
  public constructor(
    private readonly squadRepository: SquadRepository,
    private readonly queueVoiceService: QueueVoiceService,
  ) {}

  public async ensureVoiceChannel(
    guild: Guild,
    squad: SquadDto,
  ): Promise<SquadDto> {
    if (!OpenSquadStatuses.has(squad.status)) {
      return squad;
    }

    await Promise.all([guild.channels.fetch(), guild.roles.fetch()]);

    const category = this.resolveSquadVoiceCategory(guild);

    if (!category) {
      throw new SquadVoiceUnavailableError(
        "The managed squad voice category is unavailable. Ask the server owner to run `/server-setup`.",
      );
    }

    const existingChannel = squad.voiceChannelId
      ? guild.channels.cache.get(squad.voiceChannelId)
      : null;

    if (
      existingChannel?.type === ChannelType.GuildVoice &&
      this.isManagedSquadChannel(existingChannel, category)
    ) {
      await this.moveEligibleMembers(guild, existingChannel, squad);
      return squad;
    }

    if (squad.voiceChannelId) {
      await this.squadRepository.clearVoiceChannelId(
        squad.id,
        guild.id,
        squad.voiceChannelId,
      );
    }

    const members = await this.resolveSquadMembers(guild, squad);
    let channel: VoiceChannel | null = null;

    try {
      const createdChannel = await guild.channels.create({
        name: this.createChannelName(squad.id),
        type: ChannelType.GuildVoice,
        parent: category.id,
        userLimit: 5,
        permissionOverwrites: this.createPermissionOverwrites(guild, members),
        reason: `Vora squad ${squad.id}`,
      });

      if (createdChannel.type !== ChannelType.GuildVoice) {
        await createdChannel.delete("Invalid Vora squad channel type");
        throw new Error("Discord returned a non-voice squad channel.");
      }

      channel = createdChannel;

      const persisted = await this.squadRepository.setVoiceChannelId(
        squad.id,
        guild.id,
        channel.id,
      );

      if (!persisted) {
        await channel.delete("Squad session closed before voice provisioning");

        const currentDocument = await this.squadRepository.findById(squad.id);
        const currentSquad = currentDocument
          ? SquadMapper.toDto(currentDocument)
          : null;

        if (
          currentSquad &&
          currentSquad.guildId === guild.id &&
          currentSquad.voiceChannelId &&
          OpenSquadStatuses.has(currentSquad.status)
        ) {
          const concurrentChannel = guild.channels.cache.get(
            currentSquad.voiceChannelId,
          );

          if (
            concurrentChannel?.type === ChannelType.GuildVoice &&
            this.isManagedSquadChannel(concurrentChannel, category)
          ) {
            await this.moveEligibleMembers(
              guild,
              concurrentChannel,
              currentSquad,
              members,
            );
            return currentSquad;
          }
        }

        throw new SquadVoiceUnavailableError(
          "The squad session closed before its private voice channel was ready.",
        );
      }

      const updatedSquad: SquadDto = {
        ...squad,
        voiceChannelId: channel.id,
      };

      await this.moveEligibleMembers(guild, channel, updatedSquad, members);

      logger.info(
        `Created voice channel ${channel.id} for squad ${squad.id} in guild ${guild.id}.`,
      );

      return updatedSquad;
    } catch (error: unknown) {
      if (channel && !(error instanceof SquadVoiceUnavailableError)) {
        await channel
          .delete("Vora squad voice provisioning failed")
          .catch(() => undefined);
      }

      if (error instanceof SquadVoiceUnavailableError) {
        throw error;
      }

      logger.error(
        `Failed to provision voice for squad ${squad.id}:\n${formatError(error)}`,
      );

      throw new SquadVoiceUnavailableError(
        "Vora could not create the private squad voice channel. Verify the bot's channel permissions and try again.",
      );
    }
  }

  public async cleanupVoiceChannel(
    guild: Guild,
    squad: SquadDto,
  ): Promise<boolean> {
    if (!squad.voiceChannelId) {
      return false;
    }

    try {
      await guild.channels.fetch();

      const category = this.resolveSquadVoiceCategory(guild);
      const channel = guild.channels.cache.get(squad.voiceChannelId);
      let removed = false;

      if (
        category &&
        channel?.type === ChannelType.GuildVoice &&
        this.isManagedSquadChannel(channel, category)
      ) {
        await channel.delete(`Vora squad ${squad.id} closed`);
        removed = true;

        logger.info(
          `Deleted voice channel ${channel.id} for closed squad ${squad.id}.`,
        );
      } else if (channel) {
        logger.warn(
          `Refused to delete unmanaged channel ${channel.id} referenced by squad ${squad.id}.`,
        );
      }

      await this.squadRepository.clearVoiceChannelId(
        squad.id,
        guild.id,
        squad.voiceChannelId,
      );

      return removed;
    } catch (error: unknown) {
      logger.error(
        `Failed to clean up voice for squad ${squad.id}:\n${formatError(error)}`,
      );
      return false;
    }
  }

  public async reconcileGuild(
    guild: Guild,
  ): Promise<SquadVoiceReconciliationResult> {
    await Promise.all([guild.channels.fetch(), guild.roles.fetch()]);

    const category = this.resolveSquadVoiceCategory(guild);

    if (!category) {
      return {
        categoryAvailable: false,
        restoredChannels: 0,
        removedChannels: 0,
      };
    }

    const [openDocuments, referencedDocuments] = await Promise.all([
      this.squadRepository.findOpenByGuild(guild.id),
      this.squadRepository.findWithVoiceChannelByGuild(guild.id),
    ]);
    const openSquads = openDocuments.map((squad) => SquadMapper.toDto(squad));
    const openSquadIds = new Set(openSquads.map((squad) => squad.id));
    let restoredChannels = 0;
    let removedChannels = 0;

    for (const document of referencedDocuments) {
      if (!openSquadIds.has(document.id)) {
        const removed = await this.cleanupVoiceChannel(
          guild,
          SquadMapper.toDto(document),
        );
        removedChannels += removed ? 1 : 0;
      }
    }

    const activeVoiceChannelIds = new Set<string>();

    for (const squad of openSquads) {
      const channelExisted =
        squad.voiceChannelId !== null &&
        guild.channels.cache.has(squad.voiceChannelId);
      const restoredSquad = await this.ensureVoiceChannel(guild, squad);

      if (restoredSquad.voiceChannelId) {
        activeVoiceChannelIds.add(restoredSquad.voiceChannelId);
      }

      if (!channelExisted && restoredSquad.voiceChannelId) {
        restoredChannels += 1;
      }
    }

    const orphanChannels = guild.channels.cache.filter(
      (channel): channel is VoiceChannel =>
        channel.type === ChannelType.GuildVoice &&
        this.isManagedSquadChannel(channel, category) &&
        !activeVoiceChannelIds.has(channel.id),
    );

    for (const channel of orphanChannels.values()) {
      await channel.delete("Removing orphaned Vora squad voice channel");
      removedChannels += 1;
    }

    return {
      categoryAvailable: true,
      restoredChannels,
      removedChannels,
    };
  }

  private createChannelName(squadId: string): string {
    return `${SquadVoiceChannelPrefix}${squadId.slice(-8).toLowerCase()}`;
  }

  private createPermissionOverwrites(
    guild: Guild,
    members: readonly GuildMember[],
  ): OverwriteData[] {
    const overwrites: OverwriteData[] = [
      {
        id: guild.roles.everyone.id,
        type: OverwriteType.Role,
        deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
      },
    ];

    for (const roleBlueprint of GuildBlueprint.roles) {
      if (!StaffRoleKeys.has(roleBlueprint.key)) {
        continue;
      }

      const role = guild.roles.cache.find(
        (candidate) => candidate.name === roleBlueprint.name,
      );

      if (role) {
        overwrites.push({
          id: role.id,
          type: OverwriteType.Role,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
          ],
        });
      }
    }

    for (const member of members) {
      overwrites.push({
        id: member.id,
        type: OverwriteType.Member,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream,
          PermissionFlagsBits.UseVAD,
        ],
      });
    }

    if (
      guild.members.me &&
      !members.some((member) => member.id === guild.members.me?.id)
    ) {
      overwrites.push({
        id: guild.members.me.id,
        type: OverwriteType.Member,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.MoveMembers,
        ],
      });
    }

    return overwrites;
  }

  private async resolveSquadMembers(
    guild: Guild,
    squad: SquadDto,
  ): Promise<GuildMember[]> {
    const memberResults = await Promise.all(
      squad.participants
        .filter((participant) => !isSimulationDiscordId(participant.discordId))
        .map((participant) =>
          guild.members.fetch(participant.discordId).catch(() => null),
        ),
    );

    return memberResults.filter(
      (member): member is GuildMember => member !== null && !member.user.bot,
    );
  }

  private async moveEligibleMembers(
    guild: Guild,
    channel: VoiceChannel,
    squad: SquadDto,
    resolvedMembers?: readonly GuildMember[],
  ): Promise<void> {
    const members =
      resolvedMembers ?? (await this.resolveSquadMembers(guild, squad));

    await Promise.all(
      members.map(async (member) => {
        if (
          member.voice.channelId === channel.id ||
          !this.queueVoiceService.getEligibility(member).eligible
        ) {
          return;
        }

        await member.voice
          .setChannel(channel, `Vora squad ${squad.id} formed`)
          .catch((error: unknown) => {
            logger.warn(
              `Unable to move ${member.id} into squad voice ${channel.id}: ${formatError(error)}`,
            );
          });
      }),
    );
  }

  private resolveSquadVoiceCategory(guild: Guild): CategoryChannel | null {
    const blueprint = GuildBlueprint.categories.find(
      (category) => category.key === "squadVoice",
    );

    if (!blueprint) {
      return null;
    }

    return (
      guild.channels.cache.find(
        (channel): channel is CategoryChannel =>
          channel.type === ChannelType.GuildCategory &&
          channel.name === blueprint.name,
      ) ?? null
    );
  }

  private isManagedSquadChannel(
    channel: VoiceChannel,
    category: CategoryChannel,
  ): boolean {
    return (
      channel.parentId === category.id &&
      channel.name.startsWith(SquadVoiceChannelPrefix)
    );
  }
}
