import { FileUploadBuilder, LabelBuilder, ModalBuilder } from "discord.js";

import { CustomIds } from "../constants/customIds.js";

export interface PlayerVerificationModalIds {
  readonly modal: string;
  readonly screenshot: string;
}

const DefaultIds: PlayerVerificationModalIds = Object.freeze({
  modal: CustomIds.modals.playerVerificationEvidence,
  screenshot: CustomIds.inputs.playerVerification.screenshot,
});

export function createPlayerVerificationModal(
  ids: PlayerVerificationModalIds = DefaultIds,
): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(ids.modal)
    .setTitle("Verify Mobile Legends Account")
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("Mobile Legends profile screenshot")
        .setDescription(
          "Upload one clear screenshot showing your IGN, Player ID and Server ID.",
        )
        .setFileUploadComponent(
          new FileUploadBuilder()
            .setCustomId(ids.screenshot)
            .setMinValues(1)
            .setMaxValues(1)
            .setRequired(true),
        ),
    );
}
