import type { ContainerBuilder } from "discord.js";

import { ViewFactory } from "../../ui/ViewFactory.js";

export function createHowVoraWorksView(
  iconAttachmentName?: string,
): ContainerBuilder {
  const view = ViewFactory.createContainer(0x9b59b6);

  ViewFactory.addHeading(
    view,
    "Platform Guide",
    "How Vora Works",
    "From verified identity to a complete five-player Mobile Legends squad—all inside Discord.",
    iconAttachmentName,
    "Vora matchmaking",
  );

  return view
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### 1 — Register and verify",
          "Open `register` and click **Register & Submit**. The private form collects your IGN, Player ID, Server ID and one current MLBB profile screenshot. Operations approval unlocks matchmaking.",
          "",
          "### 2 — Build your role identity",
          "Open `/vora` → **Preferences** and choose two different preferred roles plus an optional avoided role. Vora supports EXP, Gold, Mid, Jungle and Roam.",
          "",
          "### 3 — Choose when to play",
          "The `matchmaking-status` panel shows live activity and planned community sessions. **Squad Alerts** are voluntary and notify subscribers only at controlled pool milestones and session times.",
          "",
          "### Optional — Keep an existing team together",
          "Already have teammates? Use `/squad` to create one persistent roster, share the generated invite code and see role coverage at a glance. A Vora Squad does not replace individual profiles or lock members out of the normal teammate pool.",
          "",
          "### 4 — Enter the teammate pool",
          "Join the managed `queue-lobby` voice channel, open `/vora` and enter the pool. You need an approved account, complete role preferences and no active matchmaking cooldown.",
          "",
          "### 5 — Vora forms the five",
          "When enough compatible players are available, Vora weighs role fit, RSR, confidence and reliability. Every completed squad receives one EXP, Gold, Mid, Jungle and Roam assignment.",
          "",
          "### 6 — Ready check and private voice",
          "All five players must respond before the deadline. A successful ready check reveals the lineup, creates a private squad voice channel and moves available members inside. Declines and missed checks can apply cooldowns.",
          "",
          "### 7 — Queue together in MLBB",
          "The five-player squad creates a lobby and queues together inside Mobile Legends. MLBB supplies the opposing team; Vora is not an internal 5v5 queue.",
          "",
          "### 8 — Report and verify the result",
          "The captain submits the real outcome with a match screenshot. Three squad confirmations verify it. Conflicts, missing evidence and expired responses enter the integrity workflow or Operations review.",
          "",
          "### 9 — Progress through Vora",
          "Verified results update match history, RSR and confidence atomically. Placements stabilize new ratings; divisions, cosmetic Discord roles, seasonal rankings, soft resets and achievements show long-term progress. Individual KDA does not directly change RSR.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "RSR measures verified competitive outcomes; behavior and integrity track reliability.",
      ),
    );
}
