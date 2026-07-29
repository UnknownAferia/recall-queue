import {
  ChannelType,
  Events,
  MessageFlags,
  type ChatInputCommandInteraction,
  type Interaction,
} from "discord.js";

import { CommunityCustomIds } from "../constants/community.js";
import { logger } from "../config/logger.js";
import { createAlertView } from "../ui/createAlertView.js";
import { formatError } from "../utils/formatError.js";
import type { CommunityClient } from "./CommunityClient.js";
import {
  executePublishAnnouncementCommand,
  PublishAnnouncementCommandName,
} from "./commands/publishAnnouncement.js";
import {
  executePublishCommunityCommand,
  PublishCommunityCommandName,
} from "./commands/publishCommunity.js";
import { OnboardingCommandName } from "./commands/onboarding.js";
import {
  executeOnboardingAudienceCommand,
  OnboardingAudienceCommandName,
} from "./commands/onboardingAudience.js";
import {
  executeVerificationInboxCommand,
  VerificationInboxCommandName,
} from "./commands/verificationInbox.js";
import { TicketAlreadyOpenError } from "./errors/TicketAlreadyOpenError.js";
import { TicketOperationError } from "./errors/TicketOperationError.js";
import { CommunityModerationError } from "./errors/CommunityModerationError.js";
import { CommunityReportError } from "./errors/CommunityReportError.js";
import { CommunitySquadError } from "./errors/CommunitySquadError.js";
import {
  parseCommunityCaseButtonId,
  parseCommunityReportModalId,
} from "./communityModerationIds.js";
import { CommunityReportDescriptionInputId } from "./ui/createCommunityReportModal.js";
import {
  channelControlCommandData,
  executeChannelControlCommand,
  executeModerationCommand,
  executeModerationHistoryCommand,
  executePurgeCommand,
  executeReportsCommand,
  executeResolveReportCommand,
  executeRevokeCaseCommand,
  moderateCommandData,
  moderationHistoryCommandData,
  purgeCommandData,
  reportsCommandData,
  resolveReportCommandData,
  revokeCaseCommandData,
} from "./commands/moderation.js";
import {
  executeReportMessageCommand,
  executeReportUserCommand,
  ReportMessageCommandName,
  ReportUserCommandName,
} from "./commands/reportContext.js";
import {
  formatCommunityCaseReference,
  formatCommunityReportReference,
} from "../constants/communityModeration.js";
import { createClosedTicketView } from "./ui/createClosedTicketView.js";
import { createTicketModal } from "./ui/createTicketModal.js";
import { handleCommunityOnboardingInteraction } from "./handleCommunityOnboardingInteraction.js";
import {
  ActivationDashboardCommandName,
  executeActivationDashboardCommand,
} from "./commands/activationDashboard.js";
import {
  executeQueueSessionCommand,
  QueueSessionCommandName,
} from "./commands/queueSession.js";
import { isPlayerVerificationApproved } from "../constants/playerVerification.js";
import { QueueActivationError } from "./errors/QueueActivationError.js";
import { createUpcomingQueueSessionsView } from "./ui/createQueueActivationView.js";
import {
  executeScrimCommand,
  ScrimCommandName,
} from "./commands/scrim.js";
import {
  CommunitySquadAdminCommandName,
  CommunitySquadCommandName,
  executeCommunitySquadAdminCommand,
  executeCommunitySquadCommand,
} from "./commands/squad.js";
import { handleCommunitySquadInteraction } from "./handleCommunitySquadInteraction.js";

function createErrorResponse(title: string, description: string) {
  return {
    components: [createAlertView("warning", title, description)],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  } as const;
}

async function respondWithError(
  interaction: Interaction,
  title: string,
  description: string,
): Promise<void> {
  if (!interaction.isRepliable()) {
    return;
  }

  const response = createErrorResponse(title, description);

  const replacesLoadingResponse =
    (interaction.isModalSubmit() &&
      (interaction.customId === CommunityCustomIds.ticket.create ||
        parseCommunityReportModalId(interaction.customId) !== null)) ||
    (interaction.isChatInputCommand() &&
      (interaction.commandName === PublishCommunityCommandName ||
        interaction.commandName === PublishAnnouncementCommandName ||
        interaction.commandName === OnboardingCommandName ||
        interaction.commandName === OnboardingAudienceCommandName ||
        interaction.commandName === VerificationInboxCommandName ||
        interaction.commandName === QueueSessionCommandName ||
        interaction.commandName === ActivationDashboardCommandName ||
        interaction.commandName === purgeCommandData.name)) ||
    (interaction.isButton() &&
      (interaction.customId === CommunityCustomIds.onboarding.refresh ||
        interaction.customId === CommunityCustomIds.onboarding.nudge));

  try {
    if (
      replacesLoadingResponse &&
      (interaction.replied || interaction.deferred)
    ) {
      await interaction.editReply({
        components: response.components,
      });
      return;
    }

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response);
    } else {
      await interaction.reply(response);
    }
  } catch (error: unknown) {
    logger.warn(
      `Unable to deliver Community error response for interaction ${interaction.id}:\n${formatError(error)}`,
    );
  }
}

export function registerCommunityInteractionHandler(
  client: CommunityClient,
): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (await handleCommunityOnboardingInteraction(client, interaction)) {
        return;
      }

      if (await handleCommunitySquadInteraction(client, interaction)) {
        return;
      }

      if (
        interaction.isMessageContextMenuCommand?.() &&
        interaction.commandName === ReportMessageCommandName
      ) {
        await executeReportMessageCommand(interaction);
        return;
      }

      if (
        interaction.isUserContextMenuCommand?.() &&
        interaction.commandName === ReportUserCommandName
      ) {
        await executeReportUserCommand(interaction);
        return;
      }

      if (interaction.isChatInputCommand()) {
        const commands: Readonly<
          Record<
            string,
            (
              client: CommunityClient,
              interaction: ChatInputCommandInteraction,
            ) => Promise<void>
          >
        > = {
          [moderateCommandData.name]: executeModerationCommand,
          [moderationHistoryCommandData.name]: executeModerationHistoryCommand,
          [revokeCaseCommandData.name]: executeRevokeCaseCommand,
          [reportsCommandData.name]: executeReportsCommand,
          [resolveReportCommandData.name]: executeResolveReportCommand,
          [purgeCommandData.name]: executePurgeCommand,
          [channelControlCommandData.name]: executeChannelControlCommand,
          [QueueSessionCommandName]: executeQueueSessionCommand,
          [ActivationDashboardCommandName]: executeActivationDashboardCommand,
          [ScrimCommandName]: executeScrimCommand,
          [CommunitySquadCommandName]: executeCommunitySquadCommand,
          [CommunitySquadAdminCommandName]:
            executeCommunitySquadAdminCommand,
        };
        const execute = commands[interaction.commandName];
        if (execute) {
          await execute(client, interaction);
          return;
        }
      }

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === OnboardingAudienceCommandName
      ) {
        await executeOnboardingAudienceCommand(client, interaction);
        return;
      }

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === VerificationInboxCommandName
      ) {
        await executeVerificationInboxCommand(client, interaction);
        return;
      }

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === PublishAnnouncementCommandName
      ) {
        await executePublishAnnouncementCommand(client, interaction);
        return;
      }

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === PublishCommunityCommandName
      ) {
        await executePublishCommunityCommand(client, interaction);
        return;
      }

      if (
        interaction.isButton() &&
        interaction.customId ===
          CommunityCustomIds.queueActivation.toggleAlerts
      ) {
        if (!interaction.inCachedGuild()) {
          return;
        }

        const player = await client.player.getByDiscordId(interaction.user.id);

        if (
          !player ||
          !isPlayerVerificationApproved(player.verification.status)
        ) {
          await interaction.reply({
            components: [
              createAlertView(
                "warning",
                "Verification Required",
                "Complete Vora account verification before enabling Squad Alerts.",
              ),
            ],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
          return;
        }

        const state = await client.activation.toggleAlerts(
          interaction.guild,
          interaction.member,
        );
        await interaction.reply({
          components: [
            createAlertView(
              state === "enabled" ? "success" : "information",
              state === "enabled"
                ? "Squad Alerts Enabled"
                : "Squad Alerts Disabled",
              state === "enabled"
                ? "You will be mentioned only for controlled teammate-pool milestones and planned community sessions."
                : "You will no longer receive Vora Squad Alert mentions.",
            ),
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }

      if (
        interaction.isButton() &&
        interaction.customId ===
          CommunityCustomIds.queueActivation.upcomingSessions
      ) {
        if (!interaction.inCachedGuild()) {
          return;
        }

        const sessions = await client.activation.getUpcomingSessions(
          interaction.guildId,
        );
        await interaction.reply({
          components: [createUpcomingQueueSessionsView(sessions)],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
        return;
      }

      if (
        interaction.isButton() &&
        interaction.customId === CommunityCustomIds.ticket.open
      ) {
        await interaction.showModal(createTicketModal());
        return;
      }

      if (interaction.isButton()) {
        const parsedCase = parseCommunityCaseButtonId(interaction.customId);
        if (parsedCase && interaction.inCachedGuild()) {
          const result =
            parsedCase.action === "confirm"
              ? await client.moderation.confirmCase(
                  interaction.guild,
                  interaction.member,
                  parsedCase.caseId,
                )
              : await client.moderation.cancelCase(
                  interaction.guild,
                  interaction.member,
                  parsedCase.caseId,
                );
          await interaction.reply({
            components: [
              createAlertView(
                parsedCase.action === "confirm" ? "success" : "information",
                parsedCase.action === "confirm"
                  ? "Action Confirmed"
                  : "Action Cancelled",
                `${formatCommunityCaseReference(result.caseNumber)} is now ${result.status}.`,
              ),
            ],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
          return;
        }
      }

      if (interaction.isModalSubmit()) {
        const parsedReport = parseCommunityReportModalId(interaction.customId);
        if (parsedReport && interaction.inCachedGuild()) {
          await interaction.reply({
            components: [
              createAlertView(
                "information",
                "Submitting Report",
                "Vora is securely recording your report for Operations review.",
              ),
            ],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
          const description = interaction.fields.getTextInputValue(
            CommunityReportDescriptionInputId,
          );
          const report =
            parsedReport.type === "user"
              ? await client.reports.submitUserReport(
                  interaction.guild,
                  interaction.member,
                  parsedReport.targetDiscordId,
                  description,
                )
              : await (async () => {
                  const channel = await interaction.guild.channels.fetch(
                    parsedReport.channelId,
                  );
                  if (!channel?.isTextBased() || channel.isDMBased()) {
                    throw new CommunityReportError(
                      "The reported message channel is no longer available.",
                    );
                  }
                  const message = await channel.messages
                    .fetch(parsedReport.messageId)
                    .catch(() => null);
                  if (!message || !message.inGuild()) {
                    throw new CommunityReportError(
                      "The reported message is no longer available.",
                    );
                  }
                  return client.reports.submitMessageReport(
                    interaction.guild,
                    interaction.member,
                    message,
                    description,
                  );
                })();

          await interaction.editReply({
            components: [
              createAlertView(
                "success",
                "Report Submitted",
                `${formatCommunityReportReference(report.reportNumber)} was sent privately to Vora Operations. Reports are never posted publicly.`,
              ),
            ],
          });
          return;
        }
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId === CommunityCustomIds.ticket.create
      ) {
        if (!interaction.inCachedGuild()) {
          return;
        }

        await interaction.reply({
          components: [
            createAlertView(
              "information",
              "Creating Ticket",
              "Vora Community is preparing your private support channel.",
            ),
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });

        const result = await client.tickets.open(
          interaction.guild,
          interaction.member,
          interaction.fields.getTextInputValue(
            CommunityCustomIds.ticket.subject,
          ),
          interaction.fields.getTextInputValue(
            CommunityCustomIds.ticket.description,
          ),
        );

        await interaction.editReply({
          components: [
            createAlertView(
              "success",
              "Ticket Opened",
              `Your private support channel is ready: <#${result.channel.id}>`,
            ),
          ],
        });
        return;
      }

      if (
        interaction.isButton() &&
        interaction.customId === CommunityCustomIds.ticket.close
      ) {
        if (
          !interaction.inCachedGuild() ||
          interaction.channel?.type !== ChannelType.GuildText
        ) {
          return;
        }

        await interaction.deferUpdate();

        const ticket = await client.tickets.close(
          interaction.guild,
          interaction.channel,
          interaction.member,
        );

        await interaction.editReply({
          components: [createClosedTicketView(ticket)],
        });
      }
    } catch (error: unknown) {
      if (
        error instanceof TicketAlreadyOpenError ||
        error instanceof TicketOperationError ||
        error instanceof CommunityModerationError ||
        error instanceof CommunityReportError ||
        error instanceof QueueActivationError ||
        error instanceof CommunitySquadError
      ) {
        await respondWithError(
          interaction,
          error instanceof QueueActivationError
            ? "Squad Alerts Unavailable"
            : error instanceof CommunitySquadError
              ? "Squad Action Unavailable"
              : "Ticket Unavailable",
          error.message,
        );
        return;
      }

      logger.error(
        `Community interaction ${interaction.id} failed:\n${formatError(error)}`,
      );
      await respondWithError(
        interaction,
        "Interaction Failed",
        "An unexpected error occurred while processing this request.",
      );
    }
  });
}
