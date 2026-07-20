import { FileUploadBuilder, LabelBuilder, ModalBuilder } from "discord.js";

import { CustomIds } from "../constants/customIds.js";

export function createResultEvidenceModal(
  squadId: string,
  outcome: "win" | "loss",
): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(CustomIds.modals.squadResultEvidence.submit(squadId, outcome))
    .setTitle(outcome === "win" ? "Report Victory" : "Report Defeat")
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("Mobile Legends result screenshot")
        .setDescription(
          "Upload one PNG, JPEG or WebP image showing the final result screen.",
        )
        .setFileUploadComponent(
          new FileUploadBuilder()
            .setCustomId(CustomIds.inputs.squadResultEvidence.screenshot)
            .setMinValues(1)
            .setMaxValues(1)
            .setRequired(true),
        ),
    );
}
