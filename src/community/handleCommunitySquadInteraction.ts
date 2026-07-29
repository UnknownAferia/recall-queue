import {
  MessageFlags,
  type Interaction,
  type ModalSubmitInteraction,
} from "discord.js";

import {
  CommunitySquadRegions,
  type CommunitySquadRegion,
} from "../constants/communitySquad.js";
import { CommunityCustomIds } from "../constants/community.js";
import {
  PlayerRoles,
  type PlayerRole,
} from "../constants/playerRoles.js";
import { logger } from "../config/logger.js";
import { createAlertView } from "../ui/createAlertView.js";
import { formatError } from "../utils/formatError.js";
import type { CommunityClient } from "./CommunityClient.js";
import { CommunitySquadError } from "./errors/CommunitySquadError.js";
import {
  createCommunitySquadJoinModal,
  createCommunitySquadProfileModal,
} from "./ui/createCommunitySquadModal.js";
import {
  createCommunitySquadConfirmationView,
  createCommunitySquadDashboardView,
  createCommunitySquadManageView,
  createCommunitySquadWelcomeView,
} from "./ui/createCommunitySquadView.js";

const squadButtonIds = new Set([
  CommunityCustomIds.squad.create,
  CommunityCustomIds.squad.edit,
  CommunityCustomIds.squad.join,
  CommunityCustomIds.squad.refresh,
  CommunityCustomIds.squad.manage,
  CommunityCustomIds.squad.back,
  CommunityCustomIds.squad.closeRecruitment,
  CommunityCustomIds.squad.regenerateInvite,
  CommunityCustomIds.squad.applyFounding,
  CommunityCustomIds.squad.leaveReview,
  CommunityCustomIds.squad.leaveConfirm,
  CommunityCustomIds.squad.disbandReview,
  CommunityCustomIds.squad.disbandConfirm,
  CommunityCustomIds.squad.cancel,
]);

async function dashboard(
  client: CommunityClient,
  guildId: string,
  discordId: string,
) {
  return client.communitySquads.getDashboard(guildId, discordId);
}

function profileInput(interaction: ModalSubmitInteraction) {
  const selectedRegion = interaction.fields.getStringSelectValues(
    CommunityCustomIds.squad.inputs.region,
  )[0];
  if (
    !selectedRegion ||
    !CommunitySquadRegions.includes(
      selectedRegion as CommunitySquadRegion,
    )
  ) {
    throw new CommunitySquadError("Select a valid squad region.");
  }
  return {
    name: interaction.fields.getTextInputValue(
      CommunityCustomIds.squad.inputs.name,
    ),
    tag:
      interaction.fields.getTextInputValue(
        CommunityCustomIds.squad.inputs.tag,
      ) || null,
    region: selectedRegion as CommunitySquadRegion,
    description:
      interaction.fields.getTextInputValue(
        CommunityCustomIds.squad.inputs.description,
      ) || null,
  };
}

async function replyWithSquadError(
  interaction: Interaction,
  error: unknown,
): Promise<void> {
  if (!interaction.isRepliable()) {
    return;
  }
  const description =
    error instanceof CommunitySquadError
      ? error.message
      : "Vora could not complete that squad action.";
  const response = {
    components: [
      createAlertView("warning", "Squad Action Unavailable", description),
    ],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  } as const;

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ components: response.components });
  } else {
    await interaction.reply(response);
  }
}

export async function handleCommunitySquadInteraction(
  client: CommunityClient,
  interaction: Interaction,
): Promise<boolean> {
  const isSquadInteraction =
    (interaction.isButton?.() && squadButtonIds.has(interaction.customId)) ||
    (interaction.isStringSelectMenu?.() &&
      interaction.customId === CommunityCustomIds.squad.recruitingRoles) ||
    (interaction.isUserSelectMenu?.() &&
      (interaction.customId === CommunityCustomIds.squad.kickMember ||
        interaction.customId ===
          CommunityCustomIds.squad.transferCaptain)) ||
    (interaction.isModalSubmit?.() &&
      (interaction.customId === CommunityCustomIds.squad.createModal ||
        interaction.customId === CommunityCustomIds.squad.editModal ||
        interaction.customId === CommunityCustomIds.squad.joinModal));

  if (!isSquadInteraction) {
    return false;
  }
  if (!interaction.inCachedGuild()) {
    return true;
  }

  try {
    if (
      interaction.isButton() &&
      interaction.customId === CommunityCustomIds.squad.create
    ) {
      await interaction.showModal(createCommunitySquadProfileModal());
      return true;
    }
    if (
      interaction.isButton() &&
      interaction.customId === CommunityCustomIds.squad.join
    ) {
      await interaction.showModal(createCommunitySquadJoinModal());
      return true;
    }
    if (
      interaction.isButton() &&
      interaction.customId === CommunityCustomIds.squad.edit
    ) {
      const squad = await dashboard(
        client,
        interaction.guildId,
        interaction.user.id,
      );
      if (!squad || squad.captainDiscordId !== interaction.user.id) {
        throw new CommunitySquadError(
          "Only the current captain can edit this squad.",
        );
      }
      await interaction.showModal(createCommunitySquadProfileModal(squad));
      return true;
    }

    if (interaction.isModalSubmit()) {
      await interaction.reply({
        components: [
          createAlertView(
            "information",
            "Updating Squad",
            "Vora is saving the roster changes.",
          ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      const squad =
        interaction.customId === CommunityCustomIds.squad.joinModal
          ? await client.communitySquads.join(
              interaction.guildId,
              interaction.user.id,
              interaction.fields.getTextInputValue(
                CommunityCustomIds.squad.inputs.inviteCode,
              ),
            )
          : interaction.customId === CommunityCustomIds.squad.createModal
            ? await client.communitySquads.create({
                guildId: interaction.guildId,
                captainDiscordId: interaction.user.id,
                ...profileInput(interaction),
              })
            : await client.communitySquads.updateProfile(
                interaction.guildId,
                interaction.user.id,
                profileInput(interaction),
              );
      await interaction.editReply({
        components: [
          createCommunitySquadDashboardView(squad, interaction.user.id),
        ],
      });
      return true;
    }

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId ===
        CommunityCustomIds.squad.recruitingRoles
    ) {
      const roles = interaction.values.filter(
        (value): value is PlayerRole =>
          PlayerRoles.includes(value as PlayerRole),
      );
      const squad = await client.communitySquads.setRecruitingRoles(
        interaction.guildId,
        interaction.user.id,
        roles,
      );
      await interaction.update({
        components: [
          createCommunitySquadDashboardView(squad, interaction.user.id),
        ],
      });
      return true;
    }

    if (interaction.isUserSelectMenu()) {
      const selectedDiscordId = interaction.values[0];
      if (!selectedDiscordId) {
        throw new CommunitySquadError("Select one squad member.");
      }
      const squad =
        interaction.customId === CommunityCustomIds.squad.kickMember
          ? await client.communitySquads.kick(
              interaction.guildId,
              interaction.user.id,
              selectedDiscordId,
            )
          : await client.communitySquads.transferCaptain(
              interaction.guildId,
              interaction.user.id,
              selectedDiscordId,
            );
      await interaction.update({
        components: [
          createCommunitySquadDashboardView(squad, interaction.user.id),
        ],
      });
      return true;
    }

    if (!interaction.isButton()) {
      return true;
    }

    const current = await dashboard(
      client,
      interaction.guildId,
      interaction.user.id,
    );
    if (
      interaction.customId === CommunityCustomIds.squad.refresh ||
      interaction.customId === CommunityCustomIds.squad.back ||
      interaction.customId === CommunityCustomIds.squad.cancel
    ) {
      await interaction.update({
        components: [
          current
            ? createCommunitySquadDashboardView(
                current,
                interaction.user.id,
              )
            : createCommunitySquadWelcomeView(),
        ],
      });
      return true;
    }
    if (!current) {
      throw new CommunitySquadError(
        "You do not currently belong to a Vora Squad.",
      );
    }
    if (interaction.customId === CommunityCustomIds.squad.manage) {
      if (current.captainDiscordId !== interaction.user.id) {
        throw new CommunitySquadError(
          "Only the current captain can manage the roster.",
        );
      }
      await interaction.update({
        components: [createCommunitySquadManageView(current)],
      });
      return true;
    }
    if (
      interaction.customId === CommunityCustomIds.squad.leaveReview ||
      interaction.customId === CommunityCustomIds.squad.disbandReview
    ) {
      await interaction.update({
        components: [
          createCommunitySquadConfirmationView(
            current,
            interaction.customId === CommunityCustomIds.squad.leaveReview
              ? "leave"
              : "disband",
          ),
        ],
      });
      return true;
    }

    if (
      interaction.customId === CommunityCustomIds.squad.closeRecruitment
    ) {
      const squad = await client.communitySquads.setRecruitingRoles(
        interaction.guildId,
        interaction.user.id,
        [],
      );
      await interaction.update({
        components: [
          createCommunitySquadDashboardView(squad, interaction.user.id),
        ],
      });
      return true;
    }
    if (
      interaction.customId === CommunityCustomIds.squad.regenerateInvite
    ) {
      const squad = await client.communitySquads.regenerateInviteCode(
        interaction.guildId,
        interaction.user.id,
      );
      await interaction.update({
        components: [
          createCommunitySquadDashboardView(squad, interaction.user.id),
        ],
      });
      return true;
    }
    if (
      interaction.customId === CommunityCustomIds.squad.applyFounding
    ) {
      const squad = await client.communitySquads.applyForFounding(
        interaction.guildId,
        interaction.user.id,
      );
      await interaction.update({
        components: [
          createCommunitySquadDashboardView(squad, interaction.user.id),
        ],
      });
      return true;
    }
    if (interaction.customId === CommunityCustomIds.squad.leaveConfirm) {
      await client.communitySquads.leave(
        interaction.guildId,
        interaction.user.id,
      );
      await interaction.update({
        components: [
          createAlertView(
            "success",
            "Squad Left",
            "You left the persistent roster. Your player profile and competitive history are unchanged.",
          ),
        ],
      });
      return true;
    }
    if (interaction.customId === CommunityCustomIds.squad.disbandConfirm) {
      await client.communitySquads.disband(
        interaction.guildId,
        interaction.user.id,
      );
      await interaction.update({
        components: [
          createAlertView(
            "success",
            "Squad Archived",
            "The roster is closed and its invite code is no longer valid. Individual player history remains intact.",
          ),
        ],
      });
      return true;
    }

    return true;
  } catch (error: unknown) {
    if (!(error instanceof CommunitySquadError)) {
      logger.error(
        `Community squad interaction ${interaction.id} failed:\n${formatError(error)}`,
      );
    }
    await replyWithSquadError(interaction, error);
    return true;
  }
}
