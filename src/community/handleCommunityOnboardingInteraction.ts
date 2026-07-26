import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  type Interaction,
} from "discord.js";

import { CommunityCustomIds } from "../constants/community.js";
import {
  CustomIds,
  parsePlayerVerificationRejectionCustomId,
  parsePlayerVerificationReviewCustomId,
} from "../constants/customIds.js";
import { isPlayerVerificationApproved } from "../constants/playerVerification.js";
import { GameAccountAlreadyRegisteredError } from "../services/errors/GameAccountAlreadyRegisteredError.js";
import { InvalidRegistrationDataError } from "../services/errors/InvalidRegistrationDataError.js";
import { PlayerAlreadyRegisteredError } from "../services/errors/PlayerAlreadyRegisteredError.js";
import { PlayerProfileNotFoundError } from "../services/errors/PlayerProfileNotFoundError.js";
import { PlayerVerificationError } from "../services/errors/PlayerVerificationError.js";
import { SystemMaintenanceError } from "../services/errors/SystemMaintenanceError.js";
import { createAlertView } from "../ui/createAlertView.js";
import { createPlayerRegistrationModal } from "../ui/createPlayerRegistrationModal.js";
import { createPlayerVerificationModal } from "../ui/createPlayerVerificationModal.js";
import { createPlayerVerificationRejectionModal } from "../ui/createPlayerVerificationRejectionModal.js";
import { createResolvedPlayerVerificationReviewView } from "../ui/createPlayerVerificationReviewView.js";
import type { CommunityClient } from "./CommunityClient.js";
import {
  executeOnboardingCommand,
  OnboardingCommandName,
} from "./commands/onboarding.js";
import { createOnboardingDashboardView } from "./ui/createOnboardingDashboardView.js";

const RegistrationModalIds = Object.freeze({
  modal: CommunityCustomIds.onboarding.registerModal,
  ign: CommunityCustomIds.onboarding.ign,
  playerId: CommunityCustomIds.onboarding.playerId,
  serverId: CommunityCustomIds.onboarding.serverId,
});

const VerificationModalIds = Object.freeze({
  modal: CommunityCustomIds.onboarding.verificationModal,
  screenshot: CommunityCustomIds.onboarding.screenshot,
});

function verificationAction() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.onboarding.verify)
      .setLabel("Submit Verification")
      .setEmoji("🛡️")
      .setStyle(ButtonStyle.Success),
  );
}

async function replyWithAlert(
  interaction: Interaction,
  tone: "information" | "success" | "warning" | "error",
  title: string,
  description: string,
): Promise<void> {
  if (!interaction.isRepliable()) {
    return;
  }

  await interaction.reply({
    components: [createAlertView(tone, title, description)],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  });
}

async function openVerification(
  client: CommunityClient,
  interaction: Interaction,
): Promise<void> {
  if (!interaction.isButton()) {
    return;
  }

  if (!interaction.inCachedGuild()) {
    await replyWithAlert(
      interaction,
      "information",
      "Continue in the Vora Server",
      "Open the onboarding channel from this message, then click Submit Verification. Screenshots can only be archived securely from the server.",
    );
    return;
  }

  const player = await client.player.getByDiscordId(interaction.user.id);

  if (!player) {
    await interaction.showModal(
      createPlayerRegistrationModal(RegistrationModalIds),
    );
    return;
  }

  if (isPlayerVerificationApproved(player.verification.status)) {
    await client.guildAccess.synchronizeVerifiedPlayerRole(
      interaction.member,
      player.verification.status,
    );
    await replyWithAlert(
      interaction,
      "success",
      "Already Verified",
      "Your account is verified and your server access has been synchronized.",
    );
    return;
  }

  if (await client.playerVerification.hasPendingRequest(interaction.user.id)) {
    await replyWithAlert(
      interaction,
      "information",
      "Verification Pending",
      "Your screenshot is already waiting for Operations review. You do not need to submit it again.",
    );
    return;
  }

  await interaction.showModal(
    createPlayerVerificationModal(VerificationModalIds),
  );
}

export async function handleCommunityOnboardingInteraction(
  client: CommunityClient,
  interaction: Interaction,
): Promise<boolean> {
  if (interaction.isButton()) {
    const review = parsePlayerVerificationReviewCustomId(interaction.customId);

    if (review) {
      if (
        !interaction.inCachedGuild() ||
        !interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)
      ) {
        await replyWithAlert(
          interaction,
          "warning",
          "Operations Access Required",
          "You need the Moderate Members permission to review player accounts.",
        );
        return true;
      }

      if (review.action === "reject") {
        await interaction.showModal(
          createPlayerVerificationRejectionModal(review.requestId),
        );
        return true;
      }

      await interaction.deferUpdate();

      try {
        const request = await client.playerVerification.review(
          review.requestId,
          interaction.guildId,
          interaction.user.id,
          "approve",
        );
        const member = await interaction.guild.members
          .fetch(request.playerDiscordId)
          .catch(() => null);

        if (member) {
          await client.guildAccess.synchronizeVerifiedPlayerRole(
            member,
            "verified",
          );
        }

        await interaction.editReply(
          createResolvedPlayerVerificationReviewView(request),
        );
      } catch (error: unknown) {
        if (error instanceof PlayerVerificationError) {
          await interaction.followUp({
            components: [
              createAlertView("warning", "Review Unavailable", error.message),
            ],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
          return true;
        }

        throw error;
      }

      return true;
    }
  }

  if (interaction.isModalSubmit()) {
    const requestId = parsePlayerVerificationRejectionCustomId(
      interaction.customId,
    );

    if (requestId) {
      if (
        !interaction.inCachedGuild() ||
        !interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)
      ) {
        await replyWithAlert(
          interaction,
          "warning",
          "Operations Access Required",
          "You need the Moderate Members permission to review player accounts.",
        );
        return true;
      }

      const reason = interaction.fields.getTextInputValue(
        CustomIds.inputs.playerVerification.rejectionReason,
      );
      await interaction.deferUpdate();

      try {
        const request = await client.playerVerification.review(
          requestId,
          interaction.guildId,
          interaction.user.id,
          "reject",
          reason,
        );
        const member = await interaction.guild.members
          .fetch(request.playerDiscordId)
          .catch(() => null);

        if (member) {
          await client.guildAccess.synchronizeVerifiedPlayerRole(
            member,
            "rejected",
          );
        }

        await interaction.editReply(
          createResolvedPlayerVerificationReviewView(request),
        );
      } catch (error: unknown) {
        if (error instanceof PlayerVerificationError) {
          await interaction.followUp({
            components: [
              createAlertView("warning", "Review Unavailable", error.message),
            ],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
          return true;
        }

        throw error;
      }

      return true;
    }
  }

  if (
    interaction.isChatInputCommand() &&
    interaction.commandName === OnboardingCommandName
  ) {
    await executeOnboardingCommand(client, interaction);
    return true;
  }

  if (
    interaction.isButton() &&
    interaction.customId === CommunityCustomIds.onboarding.register
  ) {
    const player = await client.player.getByDiscordId(interaction.user.id);

    if (player) {
      await openVerification(client, interaction);
    } else {
      await interaction.showModal(
        createPlayerRegistrationModal(RegistrationModalIds),
      );
    }
    return true;
  }

  if (
    interaction.isButton() &&
    interaction.customId === CommunityCustomIds.onboarding.verify
  ) {
    await openVerification(client, interaction);
    return true;
  }

  if (
    interaction.isModalSubmit() &&
    interaction.customId === CommunityCustomIds.onboarding.registerModal
  ) {
    try {
      const player = await client.player.registerPlayer({
        discordId: interaction.user.id,
        discordUsername: interaction.user.username,
        ign: interaction.fields.getTextInputValue(
          CommunityCustomIds.onboarding.ign,
        ),
        playerId: interaction.fields.getTextInputValue(
          CommunityCustomIds.onboarding.playerId,
        ),
        serverId: interaction.fields.getTextInputValue(
          CommunityCustomIds.onboarding.serverId,
        ),
      });

      if (interaction.inCachedGuild()) {
        await client.guildAccess.synchronizeVerifiedPlayerRole(
          interaction.member,
          player.verification.status,
        );
      }

      const view = createAlertView(
        "success",
        "Registration Complete",
        `Your Vora profile for **${player.game.ign}** is ready. Submit one current MLBB profile screenshot to unlock matchmaking.`,
      ).addActionRowComponents(verificationAction());

      await interaction.reply({
        components: [view],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    } catch (error: unknown) {
      if (
        error instanceof PlayerAlreadyRegisteredError ||
        error instanceof GameAccountAlreadyRegisteredError ||
        error instanceof InvalidRegistrationDataError ||
        error instanceof SystemMaintenanceError
      ) {
        await replyWithAlert(
          interaction,
          "warning",
          "Registration Unavailable",
          error.message,
        );
        return true;
      }

      throw error;
    }

    return true;
  }

  if (
    interaction.isModalSubmit() &&
    interaction.customId === CommunityCustomIds.onboarding.verificationModal
  ) {
    if (!interaction.inCachedGuild()) {
      return true;
    }

    const attachment = interaction.fields
      .getUploadedFiles(CommunityCustomIds.onboarding.screenshot, true)
      .first();

    if (!attachment) {
      await replyWithAlert(
        interaction,
        "warning",
        "Screenshot Required",
        "Upload one screenshot showing your Mobile Legends profile.",
      );
      return true;
    }

    await interaction.reply({
      components: [
        createAlertView(
          "information",
          "Submitting Verification",
          "Vora is securely archiving your evidence for Operations review.",
        ),
      ],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });

    try {
      const request = await client.playerVerification.submit(
        interaction.guild,
        interaction.user.id,
        attachment,
      );
      await client.guildAccess.removeVerifiedPlayerRole(interaction.member);
      await interaction.editReply({
        components: [
          createAlertView(
            "success",
            "Verification Submitted",
            `Operations received your evidence. Your request reference is \`${request.id}\`. Matchmaking unlocks after approval.`,
          ),
        ],
      });
    } catch (error: unknown) {
      if (
        error instanceof PlayerVerificationError ||
        error instanceof PlayerProfileNotFoundError
      ) {
        await interaction.editReply({
          components: [
            createAlertView(
              "warning",
              "Verification Unavailable",
              error.message,
            ),
          ],
        });
        return true;
      }

      throw error;
    }

    return true;
  }

  if (
    interaction.isButton() &&
    (interaction.customId === CommunityCustomIds.onboarding.refresh ||
      interaction.customId === CommunityCustomIds.onboarding.nudge)
  ) {
    if (
      !interaction.inCachedGuild() ||
      !interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)
    ) {
      await replyWithAlert(
        interaction,
        "warning",
        "Operations Access Required",
        "Only Vora Operations members with Manage Messages can use onboarding controls.",
      );
      return true;
    }

    const sendsReminders =
      interaction.customId === CommunityCustomIds.onboarding.nudge;

    await interaction.update({
      components: [
        createAlertView(
          "information",
          sendsReminders ? "Sending Reminders" : "Refreshing Onboarding",
          sendsReminders
            ? "Vora Community is privately contacting the next eligible onboarding batch."
            : "Vora Community is refreshing the onboarding overview.",
        ),
      ],
    });

    const result =
      sendsReminders
        ? await client.onboarding.remindEligible(interaction.guild)
        : null;
    const snapshot = await client.onboarding.getSnapshot(interaction.guild);
    const resultMessage = result
      ? `${result.delivered} reminder(s) delivered, ${result.failed} failed. ${Math.max(0, result.eligible - result.attempted)} remain eligible for a later batch.`
      : undefined;

    await interaction.editReply({
      components: [createOnboardingDashboardView(snapshot, resultMessage)],
    });
    return true;
  }

  return false;
}
