import { ChannelType, PermissionFlagsBits } from "discord.js";

export type GuildRoleKey =
  | "administrator"
  | "moderator"
  | "developer"
  | "verifiedPlayer"
  | "announcementNotifications"
  | "updateNotifications"
  | "divisionBronze"
  | "divisionSilver"
  | "divisionGold"
  | "divisionPlatinum"
  | "divisionDiamond"
  | "divisionMaster"
  | "divisionApex";

export type GuildCategoryKey =
  "information" | "vora" | "community" | "support" | "squadVoice" | "staff";

export type GuildChannelAccess =
  | "publicReadOnly"
  | "publicChat"
  | "verifiedChat"
  | "publicVoice"
  | "staffOnly";

export interface GuildRoleBlueprint {
  readonly key: GuildRoleKey;
  readonly name: string;
  readonly color: number;
  readonly permissions: readonly bigint[];
  readonly hoist: boolean;
  readonly legacyNames?: readonly string[];
}

export interface GuildCategoryBlueprint {
  readonly key: GuildCategoryKey;
  readonly name: string;
  readonly access: GuildChannelAccess;
  readonly legacyNames?: readonly string[];
}

export interface GuildChannelBlueprint {
  readonly key: string;
  readonly categoryKey: GuildCategoryKey;
  readonly name: string;
  readonly type: ChannelType.GuildText | ChannelType.GuildVoice;
  readonly access: GuildChannelAccess;
  readonly topic?: string;
  readonly legacyNames?: readonly string[];
}

export const GuildBlueprint = Object.freeze({
  version: 3,

  roles: [
    {
      key: "administrator",
      name: "Core",
      legacyNames: ["RecallQ Admin", "Vora Admin"],
      color: 0xed4245,
      permissions: [PermissionFlagsBits.Administrator],
      hoist: true,
    },
    {
      key: "moderator",
      name: "Operations",
      legacyNames: ["Moderator"],
      color: 0x5865f2,
      permissions: [
        PermissionFlagsBits.ViewAuditLog,
        PermissionFlagsBits.KickMembers,
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.MoveMembers,
      ],
      hoist: true,
    },
    {
      key: "developer",
      name: "Developer",
      color: 0x9b59b6,
      permissions: [],
      hoist: true,
    },
    {
      key: "verifiedPlayer",
      name: "Verified Player",
      color: 0xf1c40f,
      permissions: [],
      hoist: true,
    },
    {
      key: "announcementNotifications",
      name: "Announcement Notifications",
      color: 0x3498db,
      permissions: [],
      hoist: false,
    },
    {
      key: "updateNotifications",
      name: "Update Notifications",
      color: 0x1abc9c,
      permissions: [],
      hoist: false,
    },
    {
      key: "divisionBronze",
      name: "Vora Bronze",
      color: 0xcd7f32,
      permissions: [],
      hoist: false,
    },
    {
      key: "divisionSilver",
      name: "Vora Silver",
      color: 0xc0c0c0,
      permissions: [],
      hoist: false,
    },
    {
      key: "divisionGold",
      name: "Vora Gold",
      color: 0xffd700,
      permissions: [],
      hoist: false,
    },
    {
      key: "divisionPlatinum",
      name: "Vora Platinum",
      color: 0x4fd1c5,
      permissions: [],
      hoist: false,
    },
    {
      key: "divisionDiamond",
      name: "Vora Diamond",
      color: 0x45b6fe,
      permissions: [],
      hoist: false,
    },
    {
      key: "divisionMaster",
      name: "Vora Master",
      color: 0x8b5cf6,
      permissions: [],
      hoist: false,
    },
    {
      key: "divisionApex",
      name: "Vora Apex",
      color: 0x1fc8ff,
      permissions: [],
      hoist: false,
    },
  ] satisfies readonly GuildRoleBlueprint[],

  categories: [
    { key: "information", name: "📌｜START HERE", access: "publicReadOnly" },
    {
      key: "vora",
      name: "🎮｜VORA",
      access: "publicChat",
      legacyNames: ["🎮｜RECALLQ"],
    },
    { key: "community", name: "🌍｜COMMUNITY", access: "verifiedChat" },
    { key: "support", name: "🛟｜SUPPORT", access: "publicChat" },
    { key: "squadVoice", name: "🔊｜SQUAD VOICE", access: "staffOnly" },
    { key: "staff", name: "🛡️｜STAFF", access: "staffOnly" },
  ] satisfies readonly GuildCategoryBlueprint[],

  channels: [
    {
      key: "welcome",
      categoryKey: "information",
      name: "👋｜welcome",
      type: ChannelType.GuildText,
      access: "publicReadOnly",
      topic: "Welcome to Vora competitive Mobile Legends matchmaking.",
    },
    {
      key: "rules",
      categoryKey: "information",
      name: "📜｜rules",
      type: ChannelType.GuildText,
      access: "publicReadOnly",
      topic: "Community rules and competitive integrity requirements.",
    },
    {
      key: "announcements",
      categoryKey: "information",
      name: "📢｜announcements",
      type: ChannelType.GuildText,
      access: "publicReadOnly",
      topic: "Official Vora announcements.",
    },
    {
      key: "howVoraWorks",
      categoryKey: "information",
      name: "📘｜how-vora-works",
      legacyNames: ["📘｜how-recallq-works"],
      type: ChannelType.GuildText,
      access: "publicReadOnly",
      topic: "Registration, role preferences, queueing and squad formation.",
    },
    {
      key: "register",
      categoryKey: "information",
      name: "📝｜register",
      type: ChannelType.GuildText,
      access: "publicChat",
      topic: "Complete your Registration.",
    },
    {
      key: "voraCommands",
      categoryKey: "vora",
      name: "🤖｜vora",
      legacyNames: ["🤖｜recallq"],
      type: ChannelType.GuildText,
      access: "publicChat",
      topic: "Open Vora with /vora and manage your competitive profile.",
    },
    {
      key: "leaderboard",
      categoryKey: "vora",
      name: "🏆｜leaderboard",
      type: ChannelType.GuildText,
      access: "publicReadOnly",
      topic: "Vora rankings and season highlights.",
    },
    {
      key: "matchmakingStatus",
      categoryKey: "vora",
      name: "📡｜matchmaking-status",
      type: ChannelType.GuildText,
      access: "publicReadOnly",
      topic: "Live service information and matchmaking notices.",
    },
    {
      key: "queueLobby",
      categoryKey: "vora",
      name: "🎧｜queue-lobby",
      type: ChannelType.GuildVoice,
      access: "publicVoice",
    },
    {
      key: "general",
      categoryKey: "community",
      name: "💬｜general",
      type: ChannelType.GuildText,
      access: "verifiedChat",
      topic: "General conversation for verified Vora players.",
    },
    {
      key: "mobileLegends",
      categoryKey: "community",
      name: "🎮｜mobile-legends",
      type: ChannelType.GuildText,
      access: "verifiedChat",
      topic: "Mobile Legends strategy, heroes and competitive discussion.",
    },
    {
      key: "clipsAndMedia",
      categoryKey: "community",
      name: "📸｜clips-and-media",
      type: ChannelType.GuildText,
      access: "verifiedChat",
      topic: "Share your best plays, screenshots and community media.",
    },
    {
      key: "feedback",
      categoryKey: "community",
      name: "💡｜feedback",
      type: ChannelType.GuildText,
      access: "verifiedChat",
      topic: "Suggestions and feedback for the Vora platform.",
    },
    {
      key: "communityLounge",
      categoryKey: "community",
      name: "☕｜community-lounge",
      type: ChannelType.GuildVoice,
      access: "publicVoice",
    },
    {
      key: "help",
      categoryKey: "support",
      name: "❓｜help",
      type: ChannelType.GuildText,
      access: "publicChat",
      topic: "Ask for help with Vora or your player profile.",
    },
    {
      key: "openTicket",
      categoryKey: "support",
      name: "🎫｜open-a-ticket",
      type: ChannelType.GuildText,
      access: "publicReadOnly",
      topic: "Private support tickets will be opened from this channel.",
    },
    {
      key: "staffChat",
      categoryKey: "staff",
      name: "💬｜staff-chat",
      type: ChannelType.GuildText,
      access: "staffOnly",
    },
    {
      key: "moderationLog",
      categoryKey: "staff",
      name: "🧾｜moderation-log",
      type: ChannelType.GuildText,
      access: "staffOnly",
    },
    {
      key: "voraLog",
      categoryKey: "staff",
      name: "🤖｜vora-log",
      legacyNames: ["🤖｜recallq-log"],
      type: ChannelType.GuildText,
      access: "staffOnly",
    },
    {
      key: "development",
      categoryKey: "staff",
      name: "🧪｜development",
      type: ChannelType.GuildText,
      access: "staffOnly",
    },
  ] satisfies readonly GuildChannelBlueprint[],
});
