import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type MessageActionRowComponentBuilder,
} from "discord.js";

import { CustomIds } from "../constants/customIds.js";
import {
  PlayerRoleLabels,
  PlayerRoles,
  type PlayerRole,
} from "../constants/playerRoles.js";

import type { PlayerDto } from "../dto/PlayerDto.js";

function createRoleOptions(
  selectedRole: PlayerRole | null,
  excludedRoles: readonly PlayerRole[] = [],
): StringSelectMenuOptionBuilder[] {
  return PlayerRoles.filter(
    (role) => !excludedRoles.includes(role),
  ).map((role) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(PlayerRoleLabels[role])
      .setValue(role)
      .setDefault(role === selectedRole),
  );
}

export function createRolePreferencesComponents(
  player: PlayerDto,
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const { primary, secondary, avoided } =
    player.preferences.roles;

  const primaryRow =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          CustomIds.selectMenus.rolePreferences.primary,
        )
        .setPlaceholder("Select your primary role")
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(createRoleOptions(primary)),
    );

  const secondaryExcludedRoles: PlayerRole[] =
    primary ? [primary] : [];

  const secondaryRow =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          CustomIds.selectMenus.rolePreferences.secondary,
        )
        .setPlaceholder("Select your secondary role")
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
          createRoleOptions(
            secondary,
            secondaryExcludedRoles,
          ),
        ),
    );

  const avoidedExcludedRoles: PlayerRole[] = [
    ...(primary ? [primary] : []),
    ...(secondary ? [secondary] : []),
  ];

  const avoidedOptions = [
    new StringSelectMenuOptionBuilder()
      .setLabel("No avoided role")
      .setDescription("Allow assignment to any remaining role")
      .setValue("none")
      .setDefault(avoided === null),

    ...createRoleOptions(
      avoided,
      avoidedExcludedRoles,
    ),
  ];

  const avoidedRow =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          CustomIds.selectMenus.rolePreferences.avoided,
        )
        .setPlaceholder("Select an avoided role")
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(avoidedOptions),
    );

  const navigationRow =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(
          CustomIds.buttons.navigation.mainMenu,
        )
        .setLabel("Back to Main Menu")
        .setEmoji("↩️")
        .setStyle(ButtonStyle.Secondary),
    );

  return [
    primaryRow,
    secondaryRow,
    avoidedRow,
    navigationRow,
  ];
}