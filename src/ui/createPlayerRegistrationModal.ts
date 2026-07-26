import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { CustomIds } from "../constants/customIds.js";

export interface PlayerRegistrationModalIds {
  readonly modal: string;
  readonly ign: string;
  readonly playerId: string;
  readonly serverId: string;
}

const DefaultIds: PlayerRegistrationModalIds = Object.freeze({
  modal: CustomIds.modals.registerPlayer,
  ign: CustomIds.inputs.registerPlayer.ign,
  playerId: CustomIds.inputs.registerPlayer.playerId,
  serverId: CustomIds.inputs.registerPlayer.serverId,
});

export function createPlayerRegistrationModal(
  ids: PlayerRegistrationModalIds = DefaultIds,
): ModalBuilder {
  const ignInput = new TextInputBuilder()
    .setCustomId(ids.ign)
    .setLabel("In-game name")
    .setPlaceholder("Enter your Mobile Legends name")
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(32)
    .setRequired(true);

  const playerIdInput = new TextInputBuilder()
    .setCustomId(ids.playerId)
    .setLabel("Player ID")
    .setPlaceholder("Example: 123456789")
    .setStyle(TextInputStyle.Short)
    .setMinLength(4)
    .setMaxLength(15)
    .setRequired(true);

  const serverIdInput = new TextInputBuilder()
    .setCustomId(ids.serverId)
    .setLabel("Server ID")
    .setPlaceholder("Example: 1234")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(8)
    .setRequired(true);

  return new ModalBuilder()
    .setCustomId(ids.modal)
    .setTitle("Vora Registration")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(ignInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(playerIdInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(serverIdInput),
    );
}
