import type { GuildMember } from "discord.js";

import { GuildBlueprint } from "../config/guildBlueprint.js";
import { logger } from "../config/logger.js";
import {
  isPlayerVerificationApproved,
  type PlayerVerificationStatus,
} from "../constants/playerVerification.js";

export type VerifiedRoleSyncResult =
  | "assigned"
  | "already-assigned"
  | "removed"
  | "already-removed"
  | "unavailable";

export class GuildAccessService {
  public async synchronizeVerifiedPlayerRole(
    member: GuildMember,
    status: PlayerVerificationStatus,
  ): Promise<VerifiedRoleSyncResult> {
    return isPlayerVerificationApproved(status)
      ? this.ensureVerifiedPlayerRole(member)
      : this.removeVerifiedPlayerRole(member);
  }

  public async ensureVerifiedPlayerRole(
    member: GuildMember,
  ): Promise<VerifiedRoleSyncResult> {
    const roleBlueprint = GuildBlueprint.roles.find(
      (role) => role.key === "verifiedPlayer",
    );

    if (!roleBlueprint || member.user.bot) {
      return "unavailable";
    }

    try {
      let role = member.guild.roles.cache.find(
        (candidate) => candidate.name === roleBlueprint.name,
      );

      if (!role) {
        await member.guild.roles.fetch();
        role = member.guild.roles.cache.find(
          (candidate) => candidate.name === roleBlueprint.name,
        );
      }

      if (!role || !role.editable) {
        logger.warn(
          `Unable to assign ${roleBlueprint.name} in guild ${member.guild.id}. Run /server-setup and verify the bot role hierarchy.`,
        );
        return "unavailable";
      }

      if (member.roles.cache.has(role.id)) {
        return "already-assigned";
      }

      await member.roles.add(role, "Vora player profile verified");

      logger.info(
        `Assigned ${roleBlueprint.name} to ${member.user.id} in guild ${member.guild.id}.`,
      );

      return "assigned";
    } catch (error: unknown) {
      logger.error(
        `Failed to synchronize ${roleBlueprint.name} for ${member.user.id} in guild ${member.guild.id}: ${error instanceof Error ? error.message : String(error)}`,
      );

      return "unavailable";
    }
  }

  public async removeVerifiedPlayerRole(
    member: GuildMember,
  ): Promise<VerifiedRoleSyncResult> {
    const roleBlueprint = GuildBlueprint.roles.find(
      (role) => role.key === "verifiedPlayer",
    );

    if (!roleBlueprint || member.user.bot) {
      return "unavailable";
    }

    try {
      let role = member.guild.roles.cache.find(
        (candidate) => candidate.name === roleBlueprint.name,
      );

      if (!role) {
        await member.guild.roles.fetch();
        role = member.guild.roles.cache.find(
          (candidate) => candidate.name === roleBlueprint.name,
        );
      }

      if (!role || !role.editable) {
        return "unavailable";
      }

      if (!member.roles.cache.has(role.id)) {
        return "already-removed";
      }

      await member.roles.remove(role, "Vora account verification unavailable");
      logger.info(
        `Removed ${roleBlueprint.name} from ${member.user.id} in guild ${member.guild.id}.`,
      );
      return "removed";
    } catch (error: unknown) {
      logger.error(
        `Failed to remove ${roleBlueprint.name} from ${member.user.id} in guild ${member.guild.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return "unavailable";
    }
  }
}
