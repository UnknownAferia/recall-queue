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
          "### Your permanent team",
          "`/squad` — Create a persistent Vora Squad or join one with a short invite code. Captains manage the roster, recruitment needs and Founding Squad application from one private screen.",
          "`/scrim create` — Publish an opponent listing for your squad. If you already captain a Vora Squad, its name is filled in automatically.",
          "",
          "### Privacy",
          "Vora's menus and confirmations are normally ephemeral, meaning only you can see them. Invite codes should be shared only with players you trust.",
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
