import type { ContainerBuilder } from "discord.js";

import { ViewFactory } from "../../ui/ViewFactory.js";

export function createRulesView(
  iconAttachmentName?: string,
): ContainerBuilder {
  const view = ViewFactory.createContainer(0xed4245);

  ViewFactory.addHeading(
    view,
    "Community Standards",
    "Vora Rules",
    "Joining and using Vora means accepting these community and competitive-integrity rules.",
    iconAttachmentName,
    "Vora community rules",
  );

  return view
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### 1 — Respect the community",
          "Treat players and staff with respect. Harassment, hate speech, threats, targeted abuse and disruptive behavior are not permitted.",
          "",
          "### 2 — Protect competitive integrity",
          "Use your own MLBB account, submit truthful match results and upload only genuine screenshots from the reported match. Manipulated evidence, impersonation and deliberate false reports may result in immediate sanctions.",
          "",
          "### 3 — Queue responsibly",
          "Join only when you are ready to play. Remain in the queue lobby, answer ready checks on time, cooperate with your assigned squad and make a reasonable effort to play the assigned role.",
          "",
          "### 4 — Keep accounts and data safe",
          "Never share passwords, authentication codes, bot tokens or private personal information. Use a private ticket for sensitive support matters.",
          "",
          "### 5 — Understand data retention",
          "Closed ticket channels are retained for up to 7 days. Staff-only ticket transcripts, Community reports and moderation cases are retained for up to 365 days. Match-result screenshots and their audit records remain staff-only and are retained with the competitive match record for integrity reviews and appeals.",
          "",
          "### 6 — Follow staff direction",
          "Staff may remove content, close disruptive sessions, apply queue cooldowns or issue suspensions. Community and competitive decisions are recorded with case references for accountability and appeals.",
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        "> Enforcement is proportional to severity and repeated behavior. Attempting to evade a sanction may lead to a longer suspension.",
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Vora is an independent community project and is not affiliated with Moonton.",
      ),
    );
}
