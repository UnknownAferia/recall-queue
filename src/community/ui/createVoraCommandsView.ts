import type { ContainerBuilder } from "discord.js";

import { ViewFactory } from "../../ui/ViewFactory.js";

export function createVoraCommandsView(
  iconAttachmentName?: string,
): ContainerBuilder {
  const view = ViewFactory.createContainer(0x57f287);

  ViewFactory.addHeading(
    view,
    "Vora Core",
    "Competitive Hub",
    "Open your private player hub and manage every part of the competitive workflow.",
    iconAttachmentName,
    "Vora commands",
  );

  return view
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Main player controls",
          "`/vora` — Open the hub for your profile, role preferences, teammate pool, match history, season progress and leaderboards.",
          "`/profile` — Open your competitive player profile directly.",
          "",
          "### Registration and verification",
          "The recommended onboarding flow is the **Register & Submit** button in `register`.",
          "`/register` — Fallback command for creating a player profile.",
          "`/verify-account` — Fallback command for submitting evidence when a registered profile has no open verification request.",
          "",
          "### Queue activity",
          "Use `matchmaking-status` to inspect live activity, subscribe to voluntary Squad Alerts and view upcoming community queue sessions.",
          "",
          "### Privacy",
          "Vora's menus and confirmations are normally ephemeral, meaning only you can see them. Public squad information is shown only when required for the active workflow.",
          "",
          "> If matchmaking is unavailable, check `matchmaking-status`. For account-specific problems, open a private ticket.",
        ].join("\n"),
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "New player? Start in the register channel. Returning player? Open /vora.",
      ),
    );
}
