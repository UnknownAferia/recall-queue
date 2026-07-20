import type { ContainerBuilder } from "discord.js";

import { ViewFactory } from "../../ui/ViewFactory.js";

export function createHowVoraWorksView(): ContainerBuilder {
  return ViewFactory.createContainer(0x9b59b6)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Platform Guide",
        "How Vora Works",
        "Vora finds four compatible teammates for one complete five-player Mobile Legends squad.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### 1 — Player identity",
          "Your profile stores your MLBB account, Ranked Skill Rating (RSR), confidence, behavior standing, match history and role preferences.",
          "",
          "### 2 — Teammate pool",
          "Registered players with complete role preferences join the pool while connected to the managed queue-lobby voice channel. Active cooldowns prevent queue entry.",
          "",
          "### 3 — Squad formation",
          "Once enough compatible players are available, Vora optimizes role fit, RSR balance and behavior reliability. Every squad receives one EXP, Gold, Mid, Jungle and Roam assignment.",
          "",
          "### 4 — Ready check and voice",
          "All five players must respond before the deadline. A successful check creates a private squad voice channel and reveals the assignments. Missed or declined checks can apply queue cooldowns.",
          "",
          "### 5 — External MLBB match",
          "The squad queues together inside Mobile Legends and faces opponents supplied by MLBB. Vora does not normally create the opposing team.",
          "",
          "### 6 — Result and progression",
          "The captain submits the result with a screenshot. Squad confirmations verify it; disagreements go to staff review. Verified matches update statistics, RSR and confidence transactionally.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "RSR measures competitive results; behavior standing measures reliability.",
      ),
    );
}
