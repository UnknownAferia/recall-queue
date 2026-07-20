import {
  MessageFlags,
  type StringSelectMenuInteraction,
} from "discord.js";

import type { VoraClient } from "../client/VoraClient.js";
import {
  isPlayerRole,
  type PlayerRole,
} from "../constants/playerRoles.js";

import type { RolePreferenceSlot } from "../types/player.js";
import { InvalidRolePreferenceError } from "../services/errors/InvalidRolePreferenceError.js";
import { PlayerProfileNotFoundError } from "../services/errors/PlayerProfileNotFoundError.js";
import { createAlertView } from "../ui/createAlertView.js";
import { createRolePreferencesView } from "../ui/createRolePreferencesView.js";

export async function handleRolePreferenceSelection(
  client: VoraClient,
  interaction: StringSelectMenuInteraction,
  slot: RolePreferenceSlot,
): Promise<void> {
  const selectedValue = interaction.values[0];

  if (!selectedValue) {
    await interaction.reply({
      components: [
        createAlertView(
          "warning",
          "Invalid Role Selection",
          "No role was selected.",
        ),
      ],
      flags:
        MessageFlags.Ephemeral |
        MessageFlags.IsComponentsV2,
    });

    return;
  }

  let role: PlayerRole | null = null;

  if (selectedValue !== "none") {
    if (!isPlayerRole(selectedValue)) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Invalid Role Selection",
            "The selected Mobile Legends role is invalid.",
          ),
        ],
        flags:
          MessageFlags.Ephemeral |
          MessageFlags.IsComponentsV2,
      });

      return;
    }

    role = selectedValue;
  }

  try {
    const player =
      await client.services.player.setRolePreference(
        interaction.user.id,
        slot,
        role,
      );

    await interaction.update({
      components: [createRolePreferencesView(player)],
    });
  } catch (error: unknown) {
    if (
      error instanceof InvalidRolePreferenceError ||
      error instanceof PlayerProfileNotFoundError
    ) {
      await interaction.reply({
        components: [
          createAlertView(
            "warning",
            "Unable to Update Preferences",
            error.message,
          ),
        ],
        flags:
          MessageFlags.Ephemeral |
          MessageFlags.IsComponentsV2,
      });

      return;
    }

    throw error;
  }
}
