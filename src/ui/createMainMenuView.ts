import type { ContainerBuilder } from "discord.js";

import type { PlayerDto } from "../dto/PlayerDto.js";
import { createMainMenuComponents } from "./createMainMenuComponents.js";
import { ViewFactory } from "./ViewFactory.js";

export function createMainMenuView(
  player: PlayerDto | null,
): ContainerBuilder {
  const container = ViewFactory.createContainer();

  if (!player) {
    return container
      .addTextDisplayComponents(
        ViewFactory.heading(
          "Vora Competitive",
          "Welcome to Vora",
          "Skill-based Mobile Legends matchmaking, built directly into Discord.",
        ),
      )
      .addSeparatorComponents(ViewFactory.separator())
      .addTextDisplayComponents(
        ViewFactory.text(
          [
            "### Create your competitive profile",
            "Connect your Mobile Legends account before entering matchmaking.",
            "",
            "> Use `/register` to get started.",
          ].join("\n"),
        ),
        ViewFactory.footer(),
      );
  }

  return container
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Vora Competitive",
        "Competitive Hub",
        `Welcome back, **${player.game.ign}**. Choose where you want to go next.`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Player snapshot",
          `> **${player.rating.rsr.toLocaleString()}** RSR  •  **${player.statistics.matchesPlayed}** matches  •  **${player.behavior.score}/100** behavior`,
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text("### Navigation"),
    )
    .addActionRowComponents(...createMainMenuComponents())
    .addTextDisplayComponents(
      ViewFactory.footer("Your competitive journey starts here."),
    );
}
