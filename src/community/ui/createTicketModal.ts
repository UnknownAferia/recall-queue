import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { CommunityCustomIds } from "../../constants/community.js";

export function createTicketModal(): ModalBuilder {
  const subject = new TextInputBuilder()
    .setCustomId(CommunityCustomIds.ticket.subject)
    .setLabel("Subject")
    .setPlaceholder("Briefly describe what you need help with")
    .setStyle(TextInputStyle.Short)
    .setMinLength(3)
    .setMaxLength(80)
    .setRequired(true);
  const description = new TextInputBuilder()
    .setCustomId(CommunityCustomIds.ticket.description)
    .setLabel("Details")
    .setPlaceholder("Include relevant player, squad or match references")
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(10)
    .setMaxLength(1_000)
    .setRequired(true);

  return new ModalBuilder()
    .setCustomId(CommunityCustomIds.ticket.create)
    .setTitle("Open Vora Support Ticket")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(subject),
      new ActionRowBuilder<TextInputBuilder>().addComponents(description),
    );
}
