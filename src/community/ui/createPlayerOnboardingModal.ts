import {
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { CommunityCustomIds } from "../../constants/community.js";

function textInput(
  customId: string,
  placeholder: string,
  minimumLength: number,
  maximumLength: number,
): TextInputBuilder {
  return new TextInputBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .setStyle(TextInputStyle.Short)
    .setMinLength(minimumLength)
    .setMaxLength(maximumLength)
    .setRequired(true);
}

export function createPlayerOnboardingModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(CommunityCustomIds.onboarding.registerModal)
    .setTitle("Create & Verify Vora Profile")
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("In-game name")
        .setDescription("Your current Mobile Legends name.")
        .setTextInputComponent(
          textInput(
            CommunityCustomIds.onboarding.ign,
            "Example: Vora Player",
            2,
            32,
          ),
        ),
      new LabelBuilder()
        .setLabel("Player ID")
        .setDescription("The numeric Player ID shown on your MLBB profile.")
        .setTextInputComponent(
          textInput(
            CommunityCustomIds.onboarding.playerId,
            "Example: 123456789",
            4,
            15,
          ),
        ),
      new LabelBuilder()
        .setLabel("Server ID")
        .setDescription("The numeric Server ID shown in parentheses.")
        .setTextInputComponent(
          textInput(
            CommunityCustomIds.onboarding.serverId,
            "Example: 1234",
            1,
            8,
          ),
        ),
      new LabelBuilder()
        .setLabel("Mobile Legends profile screenshot")
        .setDescription(
          "Upload one current screenshot showing the same IGN, Player ID and Server ID.",
        )
        .setFileUploadComponent(
          new FileUploadBuilder()
            .setCustomId(CommunityCustomIds.onboarding.screenshot)
            .setMinValues(1)
            .setMaxValues(1)
            .setRequired(true),
        ),
    );
}
