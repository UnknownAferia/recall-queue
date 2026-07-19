export const PlayerRoles = [
  "exp",
  "gold",
  "mid",
  "jungle",
  "roam",
] as const;

export type PlayerRole = (typeof PlayerRoles)[number];

export const PlayerRoleLabels: Readonly<
  Record<PlayerRole, string>
> = Object.freeze({
  exp: "EXP Lane",
  gold: "Gold Lane",
  mid: "Mid Lane",
  jungle: "Jungle",
  roam: "Roam",
});

export function isPlayerRole(value: string): value is PlayerRole {
  return PlayerRoles.includes(value as PlayerRole);
}