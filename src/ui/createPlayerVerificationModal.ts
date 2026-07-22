import { FileUploadBuilder, LabelBuilder, ModalBuilder } from "discord.js";

import { CustomIds } from "../constants/customIds.js";

export function createPlayerVerificationModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(CustomIds.modals.playerVerificationEvidence)
    .setTitle("Verify Mobile Legends Account")
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("Mobile Legends profile screenshot")
        .setDescription(
          "Upload one clear screenshot showing your IGN, Player ID and Server ID.",
        )
        .setFileUploadComponent(
          new FileUploadBuilder()
            .setCustomId(CustomIds.inputs.playerVerification.screenshot)
            .setMinValues(1)
            .setMaxValues(1)
            .setRequired(true),
        ),
    );
}
