import { resolve } from "node:path";

export interface BrandAsset {
  readonly attachmentName: string;
  readonly filePath: string;
}

function asset(fileName: string): BrandAsset {
  return Object.freeze({
    attachmentName: fileName,
    filePath: resolve(process.cwd(), "assets", fileName),
  });
}

function iconAsset(
  attachmentName: string,
  category: string,
  fileName: string,
): BrandAsset {
  return Object.freeze({
    attachmentName,
    filePath: resolve(
      process.cwd(),
      "assets",
      "icons",
      category,
      fileName,
    ),
  });
}

export const BrandColors = Object.freeze({
  midnight: 0x081220,
  slate: 0x182232,
  voraCyan: 0x1fc8ff,
  white: 0xf8fafc,
  emerald: 0x10b981,
  amber: 0xf59e0b,
  rose: 0xf43f5e,
  purple: 0x8b5cf6,
});

export const BrandAssets = Object.freeze({
  icon: asset("Vora.png"),
  banner: asset("Vora_Banner.png"),
  alphaBanner: asset("Vora_Alpha_Banner.png"),
  advertisement: asset("Vora_AD.png"),
  iconOverview: asset("Vora_Icons.png"),
  individualIconOverview: asset("Vora_Single_Icons.png"),
  designConcept: asset("Vora_Design_Concept.png"),
  panelIcons: Object.freeze({
    rules: iconAsset("vora-rules.png", "02-server-channels", "rules.png"),
    announcements: iconAsset(
      "vora-announcements.png",
      "02-server-channels",
      "announcements.png",
    ),
    howVoraWorks: iconAsset(
      "vora-matchmaking.png",
      "03-gaming-match",
      "matchmaking.png",
    ),
    register: iconAsset(
      "vora-verify.png",
      "02-server-channels",
      "verify.png",
    ),
    commands: iconAsset(
      "vora-commands.png",
      "02-server-channels",
      "commands.png",
    ),
    help: iconAsset(
      "vora-support.png",
      "02-server-channels",
      "support.png",
    ),
    tickets: iconAsset(
      "vora-tickets.png",
      "02-server-channels",
      "tickets.png",
    ),
    leaderboard: iconAsset(
      "vora-victory.png",
      "03-gaming-match",
      "victory.png",
    ),
    matchmakingStatus: iconAsset(
      "vora-live-matchmaking.png",
      "03-gaming-match",
      "matchmaking.png",
    ),
  }),
});
