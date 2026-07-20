import type { ContainerBuilder } from "discord.js";

import {
  PlayerRoleLabels,
  type PlayerRole,
} from "../constants/playerRoles.js";
import type { PlayerDto } from "../dto/PlayerDto.js";
import { createRolePreferencesComponents } from "./createRolePreferencesComponents.js";
import { ViewFactory } from "./ViewFactory.js";

function formatRole(
  role: PlayerRole | null,
  fallback: string,
): string {
  return role ? PlayerRoleLabels[role] : fallback;
}

export function createRolePreferencesView(
  player: PlayerDto,
): ContainerBuilder {
  return ViewFactory.createContainer(0x9b59b6)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Matchmaking Settings",
        "Role Preferences",
        "Shape how Vora assigns you when building balanced teams.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Current setup",
          `🥇 **Primary**  ${formatRole(player.preferences.roles.primary, "Not set")}`,
          `🥈 **Secondary**  ${formatRole(player.preferences.roles.secondary, "Not set")}`,
          `🚫 **Avoided**  ${formatRole(player.preferences.roles.avoided, "None")}`,
          "",
          "-# Primary receives the highest priority. Avoided is only used when no suitable alternative exists.",
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text("### Configure roles"),
    )
    .addActionRowComponents(
      ...createRolePreferencesComponents(player),
    )
    .addTextDisplayComponents(
      ViewFactory.footer("Changes are saved immediately."),
    );
}
