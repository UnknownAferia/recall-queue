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
});
