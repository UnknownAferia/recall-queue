import { ChannelType, MessageFlags, type Guild } from "discord.js";

import type { VoraClient } from "../client/VoraClient.js";
import { GuildBlueprint } from "../config/guildBlueprint.js";
import { logger } from "../config/logger.js";
import { SquadConfig } from "../constants/squad.js";
import type { SquadDto } from "../dto/SquadDto.js";
import { createResultLifecycleIncidentView } from "../ui/createResultLifecycleIncidentView.js";
import { formatError } from "../utils/formatError.js";

async function publishIncident(guild: Guild, squad: SquadDto): Promise<void> {
  await guild.channels.fetch();

  const blueprint = GuildBlueprint.channels.find(
    (channel) => channel.key === "moderationLog",
  );
  const categoryName = GuildBlueprint.categories.find(
    (category) => category.key === blueprint?.categoryKey,
  )?.name;
  const channel = guild.channels.cache.find(
    (candidate) =>
      candidate.type === ChannelType.GuildText &&
      candidate.name === blueprint?.name &&
      candidate.parent?.name === categoryName,
  );

  if (channel?.type !== ChannelType.GuildText) {
    logger.warn(
      `Unable to publish result lifecycle incident for squad ${squad.id}: managed moderation-log is unavailable.`,
    );
    return;
  }

  await channel.send({
    components: [createResultLifecycleIncidentView(squad)],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  });
}

export function startResultLifecycleExpirationJob(client: VoraClient): void {
  let sweepInProgress = false;

  const sweep = async (): Promise<void> => {
    if (sweepInProgress || !client.isReady()) {
      return;
    }

    sweepInProgress = true;

    try {
      const result =
        await client.services.resultLifecycleExpiration.expireOverdueCases();

      for (const squad of result.expiredSquads) {
        try {
          const guild =
            client.guilds.cache.get(squad.guildId) ??
            (await client.guilds.fetch(squad.guildId).catch(() => null));

          if (!guild) {
            logger.warn(
              `Unable to finalize result lifecycle incident for squad ${squad.id}: guild ${squad.guildId} is unavailable.`,
            );
            continue;
          }

          await client.services.squadVoice.cleanupVoiceChannel(guild, squad);
          await publishIncident(guild, squad);
        } catch (error: unknown) {
          logger.error(
            `Unable to finalize result lifecycle incident for squad ${squad.id}:\n${formatError(error)}`,
          );
        }
      }

      if (result.expiredSquads.length > 0) {
        logger.info(
          `Resolved ${result.expiredSquads.length} expired result case(s) and penalized ${result.penalizedPlayers} responsible player(s).`,
        );
      }
    } catch (error: unknown) {
      logger.error(
        `Result lifecycle expiration sweep failed:\n${formatError(error)}`,
      );
    } finally {
      sweepInProgress = false;
    }
  };

  void sweep();

  const timer = setInterval(
    () => void sweep(),
    SquadConfig.resultLifecycleSweepIntervalMs,
  );

  timer.unref();
}
