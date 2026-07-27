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
          "### 2 — Use one truthful player identity",
          "Register only your own MLBB account. Account evidence must match the IGN, Player ID and Server ID submitted to Vora. Impersonation, duplicate identities and manipulated verification evidence are prohibited.",
          "",
          "### 3 — Queue responsibly",
          "Enter the teammate pool only when you are ready to play. Remain in `queue-lobby`, answer ready checks before the deadline and do not repeatedly decline, disappear or abandon formed squads.",
          "",
          "### 4 — Cooperate with your squad",
          "Respect assigned roles, communicate in the private squad room and make a genuine effort to complete the external MLBB match. Vora forms teammates; MLBB supplies the opposing team.",
          "",
          "### 5 — Protect competitive integrity",
          "Captains must report the real result and upload a genuine screenshot from that match. Squad members must answer result confirmations honestly. False reports, manipulated evidence, collusion and deliberate abuse may result in rating corrections and sanctions.",
          "",
          "### 6 — Report problems through the correct channel",
          "Use Discord's **Report Message** or **Report User** app action for community conduct. Use a private ticket for account issues, appeals, disputed results or sensitive information. Do not publish private evidence in public channels.",
          "",
          "### 7 — Keep accounts and data safe",
          "Never share passwords, authentication codes, bot tokens or private personal information. Vora only requests the evidence described in the registration or result workflow.",
          "",
          "### 8 — Understand moderation and retention",
          "Closed ticket channels are retained for up to 7 days. Staff-only ticket transcripts, Community reports and moderation cases are retained for up to 365 days. Match-result screenshots and their audit records remain staff-only and are retained with the competitive match record for integrity reviews and appeals.",
          "",
          "### 9 — Follow Operations direction",
          "Staff may remove content, close disruptive sessions, apply queue cooldowns or issue suspensions. Community and competitive decisions are recorded with case references for accountability and appeals.",
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        "> Enforcement is proportional to severity and repeated behavior. Evading a cooldown, suspension or account restriction may lead to a longer sanction.",
      ),
    )
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Vora is an independent community project and is not affiliated with Moonton.",
      ),
    );
}
