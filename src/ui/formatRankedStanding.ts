import type { RankedStanding } from "../domain/rating/RankedDivision.js";

export function formatRankedStanding(standing: RankedStanding): string {
  if (standing.state === "placement") {
    return `Placement ${standing.matchesCompleted}/${standing.matchesRequired}`;
  }

  if (!standing.nextDivision || standing.requiredRsr === null) {
    return standing.division.name;
  }

  return `${standing.division.name} · ${standing.progressRsr}/${standing.requiredRsr} RSR to ${standing.nextDivision.name}`;
}
