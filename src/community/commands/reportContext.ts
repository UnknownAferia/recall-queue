import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  InteractionContextType,
  type MessageContextMenuCommandInteraction,
  type UserContextMenuCommandInteraction,
} from "discord.js";

import {
  createMessageReportModalId,
  createUserReportModalId,
} from "../communityModerationIds.js";
import { createCommunityReportModal } from "../ui/createCommunityReportModal.js";

export const ReportMessageCommandName = "Report Message";
export const ReportUserCommandName = "Report User";

export const reportMessageCommandData = new ContextMenuCommandBuilder()
  .setName(ReportMessageCommandName)
  .setType(ApplicationCommandType.Message)
  .setContexts(InteractionContextType.Guild);

export const reportUserCommandData = new ContextMenuCommandBuilder()
  .setName(ReportUserCommandName)
  .setType(ApplicationCommandType.User)
  .setContexts(InteractionContextType.Guild);

export async function executeReportMessageCommand(
  interaction: MessageContextMenuCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.showModal(
    createCommunityReportModal(
      createMessageReportModalId(
        interaction.targetMessage.channelId,
        interaction.targetMessage.id,
      ),
      "Message",
    ),
  );
}

export async function executeReportUserCommand(
  interaction: UserContextMenuCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  await interaction.showModal(
    createCommunityReportModal(
      createUserReportModalId(interaction.targetUser.id),
      interaction.targetUser.displayName,
    ),
  );
}
