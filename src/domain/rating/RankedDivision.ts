export interface RankedDivision {
  readonly key:
    "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "apex";
  readonly name: string;
  readonly minimumRsr: number;
}

export const RankedDivisions: readonly RankedDivision[] = Object.freeze([
  { key: "bronze", name: "Bronze", minimumRsr: 0 },
  { key: "silver", name: "Silver", minimumRsr: 900 },
  { key: "gold", name: "Gold", minimumRsr: 1_100 },
  { key: "platinum", name: "Platinum", minimumRsr: 1_300 },
  { key: "diamond", name: "Diamond", minimumRsr: 1_500 },
  { key: "master", name: "Master", minimumRsr: 1_750 },
  { key: "apex", name: "Apex", minimumRsr: 2_000 },
]);

export type RankedStanding =
  | {
      readonly state: "placement";
      readonly matchesCompleted: number;
      readonly matchesRequired: number;
    }
  | {
      readonly state: "ranked";
      readonly division: RankedDivision;
      readonly nextDivision: RankedDivision | null;
      readonly progressRsr: number;
      readonly requiredRsr: number | null;
      readonly progressPercentage: number;
    };
