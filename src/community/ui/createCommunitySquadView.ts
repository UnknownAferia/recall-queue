import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
  type ContainerBuilder,
} from "discord.js";

import {
  CommunitySquadConfig,
  CommunitySquadRegionLabels,
  formatCommunitySquadInviteCode,
} from "../../constants/communitySquad.js";
import { CommunityCustomIds } from "../../constants/community.js";
import {
  PlayerRoleLabels,
  PlayerRoles,
  type PlayerRole,
} from "../../constants/playerRoles.js";
import { BrandColors } from "../../config/brand.js";
import type {
  CommunitySquadDashboard,
  CommunitySquadSummary,
} from "../../types/communitySquad.js";
import { ViewFactory } from "../../ui/ViewFactory.js";

function roleLabel(role: PlayerRole | null): string {
  return role ? PlayerRoleLabels[role] : "Not set";
}

function foundingLabel(squad: CommunitySquadDashboard): string {
  switch (squad.founding.status) {
    case "applied":
      return "Application pending";
    case "founding":
      return "Founding Squad";
    case "rejected":
      return "Application needs changes";
    default:
      return "Not enrolled";
  }
}

function rosterLines(squad: CommunitySquadDashboard): string {
  return squad.roster
    .map(
      (member) =>
        `${member.isCaptain ? "👑" : "•"} <@${member.discordId}> · **${member.ign}** · ${roleLabel(member.primaryRole)} / ${roleLabel(member.secondaryRole)} · ${member.rsr} RSR`,
    )
    .join("\n");
}

function mainActions(
  squad: CommunitySquadDashboard,
  viewerDiscordId: string,
) {
  const isCaptain = squad.captainDiscordId === viewerDiscordId;
  const primary = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.squad.refresh)
      .setLabel("Refresh")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),
    ...(isCaptain
      ? [
          new ButtonBuilder()
            .setCustomId(CommunityCustomIds.squad.edit)
            .setLabel("Edit Squad")
            .setEmoji("✏️")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(CommunityCustomIds.squad.manage)
            .setLabel("Manage Roster")
            .setEmoji("👥")
            .setStyle(ButtonStyle.Secondary),
        ]
      : []),
  );

  if (!isCaptain) {
    primary.addComponents(
      new ButtonBuilder()
        .setCustomId(CommunityCustomIds.squad.leaveReview)
        .setLabel("Leave Squad")
        .setEmoji("↩️")
        .setStyle(ButtonStyle.Danger),
    );
    return [primary];
  }

  const recruiting = new StringSelectMenuBuilder()
    .setCustomId(CommunityCustomIds.squad.recruitingRoles)
    .setPlaceholder("Select the roles your squad is recruiting")
    .setMinValues(1)
    .setMaxValues(PlayerRoles.length)
    .addOptions(
      PlayerRoles.map((role) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(PlayerRoleLabels[role])
          .setValue(role)
          .setDefault(squad.recruitingRoles.includes(role)),
      ),
    );
  const recruitmentRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(recruiting);
  const captainActions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.squad.closeRecruitment)
      .setLabel("Close Recruitment")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(squad.recruitingRoles.length === 0),
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.squad.regenerateInvite)
      .setLabel("New Invite Code")
      .setEmoji("🔑")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.squad.applyFounding)
      .setLabel(
        squad.founding.status === "founding"
          ? "Founding Squad"
          : squad.founding.status === "applied"
            ? "Application Pending"
            : "Apply as Founding Squad",
      )
      .setEmoji("⭐")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(
        squad.founding.status === "founding" ||
          squad.founding.status === "applied",
      ),
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.squad.disbandReview)
      .setLabel("Disband")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger),
  );
  return [primary, recruitmentRow, captainActions];
}

export function createCommunitySquadWelcomeView(): ContainerBuilder {
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.squad.create)
      .setLabel("Create a Squad")
      .setEmoji("✨")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.squad.join)
      .setLabel("Join with Code")
      .setEmoji("🔗")
      .setStyle(ButtonStyle.Success),
  );

  return ViewFactory.createContainer(BrandColors.voraCyan)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Vora Squads",
        "Bring Your Team Together",
        "Create one persistent home for your captain, roster, role coverage and recruitment needs.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Start in one click",
          "**Create a Squad** if you lead the team. Vora generates a private invite code automatically.",
          "**Join with Code** if your captain already created the roster.",
          "",
          "> Every member must have a verified Vora profile. You can still use normal teammate matchmaking independently.",
        ].join("\n"),
      ),
    )
    .addActionRowComponents(actions)
    .addTextDisplayComponents(
      ViewFactory.footer(
        "No Discord IDs or database references required.",
      ),
    );
}

export function createCommunitySquadDashboardView(
  squad: CommunitySquadDashboard,
  viewerDiscordId: string,
): ContainerBuilder {
  const recruiting =
    squad.recruitingRoles.length === 0
      ? "Closed"
      : squad.recruitingRoles.map((role) => PlayerRoleLabels[role]).join(", ");
  const uncovered =
    squad.uncoveredRoles.length === 0
      ? "Every role is represented"
      : squad.uncoveredRoles.map((role) => PlayerRoleLabels[role]).join(", ");

  const view = ViewFactory.createContainer(BrandColors.voraCyan)
    .addTextDisplayComponents(
      ViewFactory.heading(
        `Vora Squad · ${CommunitySquadRegionLabels[squad.region]}`,
        `[${squad.tag}] ${squad.name}`,
        squad.description ?? "A persistent Vora squad roster.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Squad overview",
          `**Captain:** <@${squad.captainDiscordId}>`,
          `**Roster:** ${squad.roster.length}/${CommunitySquadConfig.maximumMembers}`,
          `**Recruiting:** ${recruiting}`,
          `**Role coverage:** ${uncovered}`,
          `**Program:** ${foundingLabel(squad)}`,
          "",
          "### Current roster",
          rosterLines(squad),
          "",
          "### Member invite",
          `Share only this code with players you trust: \`${formatCommunitySquadInviteCode(squad.inviteCode)}\``,
          "They open `/squad`, choose **Join with Code**, and paste it.",
        ].join("\n"),
      ),
    );

  for (const row of mainActions(squad, viewerDiscordId)) {
    view.spliceComponents(view.components.length, 0, row);
  }
  return view.addTextDisplayComponents(
    ViewFactory.footer(
      "Squad membership is persistent. Matchmaking ratings and verification remain individual.",
    ),
  );
}

export function createCommunitySquadManageView(
  squad: CommunitySquadDashboard,
): ContainerBuilder {
  const removable = new UserSelectMenuBuilder()
    .setCustomId(CommunityCustomIds.squad.kickMember)
    .setPlaceholder("Select one roster member to remove")
    .setMinValues(1)
    .setMaxValues(1);
  const successor = new UserSelectMenuBuilder()
    .setCustomId(CommunityCustomIds.squad.transferCaptain)
    .setPlaceholder("Select the next captain")
    .setMinValues(1)
    .setMaxValues(1);
  const back = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.squad.back)
      .setLabel("Back to Squad")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary),
  );

  return ViewFactory.createContainer(BrandColors.purple)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Captain Controls",
        `Manage [${squad.tag}] ${squad.name}`,
        "Select a member directly from Discord. Vora validates that they belong to this roster.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(
      ViewFactory.text(
        [
          "### Current roster",
          rosterLines(squad),
          "",
          "> Removing a member does not delete their Vora profile or history.",
        ].join("\n"),
      ),
    )
    .addActionRowComponents<UserSelectMenuBuilder>(
      new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(removable),
      new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(successor),
    )
    .addActionRowComponents<ButtonBuilder>(back)
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Captain transfer takes effect immediately and can be reversed by the new captain.",
      ),
    );
}

export function createCommunitySquadConfirmationView(
  squad: CommunitySquadDashboard,
  action: "leave" | "disband",
): ContainerBuilder {
  const destructive = action === "disband";
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(
        destructive
          ? CommunityCustomIds.squad.disbandConfirm
          : CommunityCustomIds.squad.leaveConfirm,
      )
      .setLabel(destructive ? "Disband Squad" : "Leave Squad")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(CommunityCustomIds.squad.cancel)
      .setLabel("Keep Squad")
      .setStyle(ButtonStyle.Secondary),
  );

  return ViewFactory.createContainer(BrandColors.rose)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Confirmation Required",
        destructive ? "Disband this squad?" : "Leave this squad?",
        destructive
          ? `This archives **[${squad.tag}] ${squad.name}**, closes recruitment and removes every member from its roster.`
          : `You will leave **[${squad.tag}] ${squad.name}** and need a current invite code to return.`,
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addActionRowComponents(actions)
    .addTextDisplayComponents(
      ViewFactory.footer(
        destructive
          ? "Player profiles, results and season history are never deleted."
          : "Your individual Vora progress remains unchanged.",
      ),
    );
}

export function createFoundingApplicationsView(
  squads: readonly CommunitySquadSummary[],
): ContainerBuilder {
  const body =
    squads.length === 0
      ? "> No Founding Squad application is awaiting review."
      : squads
          .map(
            (squad) =>
              `### [${squad.tag}] ${squad.name}\n**Captain:** <@${squad.captainDiscordId}> · **Members:** ${squad.members.length}\n**Region:** ${CommunitySquadRegionLabels[squad.region]} · **Code:** \`${formatCommunitySquadInviteCode(squad.inviteCode)}\``,
          )
          .join("\n\n");

  return ViewFactory.createContainer(BrandColors.amber)
    .addTextDisplayComponents(
      ViewFactory.heading(
        "Operations",
        "Founding Squad Applications",
        "Verified five-player rosters asking to join the Founding Squad program.",
      ),
    )
    .addSeparatorComponents(ViewFactory.separator())
    .addTextDisplayComponents(ViewFactory.text(body))
    .addTextDisplayComponents(
      ViewFactory.footer(
        "Review with /squad-admin approve or /squad-admin reject using the visible code.",
      ),
    );
}
