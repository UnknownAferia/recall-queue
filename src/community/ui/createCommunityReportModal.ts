import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export const CommunityReportDescriptionInputId = "community:report:description";

export function createCommunityReportModal(
  customId: string,
  targetLabel: string,
): ModalBuilder {
  const description = new TextInputBuilder()
    .setCustomId(CommunityReportDescriptionInputId)
    .setLabel("What happened?")
    .setPlaceholder("Explain the rule violation and relevant context.")
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(10)
    .setMaxLength(1_000)
    .setRequired(true);

  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(`Report ${targetLabel}`.slice(0, 45))
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(description),
    );
}
