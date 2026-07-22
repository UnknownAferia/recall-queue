import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import { PlayerVerificationConfig } from "../constants/playerVerification.js";

export function createPlayerVerificationRejectionModal(
  requestId: string,
): ModalBuilder {
  const reason = new TextInputBuilder()
    .setCustomId(CustomIds.inputs.playerVerification.rejectionReason)
    .setLabel("Reason for rejection")
    .setPlaceholder("Explain what the player must correct")
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(PlayerVerificationConfig.rejectionReasonMinimumLength)
    .setMaxLength(PlayerVerificationConfig.rejectionReasonMaximumLength)
    .setRequired(true);

  return new ModalBuilder()
    .setCustomId(
      CustomIds.modals.playerVerificationRejection.submit(requestId),
    )
    .setTitle("Reject Account Verification")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(reason),
    );
}
