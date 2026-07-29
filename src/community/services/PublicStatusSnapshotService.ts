import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { PublicCompetitionSnapshot } from "../../types/publicCompetition.js";
import type {
  PublicStatusCondition,
  PublicStatusIncident,
  PublicStatusSnapshot,
} from "../../types/publicStatus.js";

const SnapshotFileName = "status.json";
const RetentionDays = 90;

function conditionFor(
  availability: PublicCompetitionSnapshot["service"]["availability"],
): PublicStatusCondition {
  if (availability === "offline") {
    return "outage";
  }

  return availability === "paused" ? "degraded" : "operational";
}

function incidentTitle(
  condition: Exclude<PublicStatusCondition, "operational">,
) {
  return condition === "outage"
    ? "Vora Core is unavailable"
    : "Matchmaking is temporarily paused";
}

export class PublicStatusSnapshotService {
  public constructor(
    private readonly outputDirectory = process.env.VORA_PUBLIC_DATA_DIRECTORY?.trim() ||
      null,
  ) {}

  public async publish(
    competition: PublicCompetitionSnapshot | null,
    now = new Date(),
  ): Promise<PublicStatusSnapshot | null> {
    if (!this.outputDirectory || !competition) {
      return null;
    }

    await mkdir(this.outputDirectory, { recursive: true });
    const previous = await this.read();
    const condition = conditionFor(competition.service.availability);
    const date = now.toISOString().slice(0, 10);
    const history = [...(previous?.history ?? [])];
    const existingDay = history.find((entry) => entry.date === date);

    if (existingDay) {
      const index = history.indexOf(existingDay);
      history[index] = {
        date,
        checks: existingDay.checks + 1,
        successfulChecks:
          existingDay.successfulChecks + (condition === "operational" ? 1 : 0),
      };
    } else {
      history.push({
        date,
        checks: 1,
        successfulChecks: condition === "operational" ? 1 : 0,
      });
    }

    const incidents = [...(previous?.incidents ?? [])];
    const openIncident = incidents.find((incident) => !incident.resolvedAt);

    if (condition === "operational" && openIncident) {
      const index = incidents.indexOf(openIncident);
      incidents[index] = { ...openIncident, resolvedAt: now.toISOString() };
    } else if (condition !== "operational" && !openIncident) {
      incidents.unshift({
        id: `${now.getTime().toString(36)}-${condition}`,
        startedAt: now.toISOString(),
        resolvedAt: null,
        title: incidentTitle(condition),
        impact: condition,
      });
    } else if (
      condition !== "operational" &&
      openIncident &&
      openIncident.impact !== condition
    ) {
      const index = incidents.indexOf(openIncident);
      incidents[index] = { ...openIncident, resolvedAt: now.toISOString() };
      incidents.unshift({
        id: `${now.getTime().toString(36)}-${condition}`,
        startedAt: now.toISOString(),
        resolvedAt: null,
        title: incidentTitle(condition),
        impact: condition,
      });
    }

    const snapshot: PublicStatusSnapshot = {
      schemaVersion: 1,
      generatedAt: now.toISOString(),
      condition,
      services: {
        website: "operational",
        community: "operational",
        core: condition,
        matchmaking: competition.service.availability,
      },
      history: history.slice(-RetentionDays),
      incidents: incidents.slice(0, 20),
    };

    const target = join(this.outputDirectory, SnapshotFileName);
    const temporary = join(
      this.outputDirectory,
      `.${SnapshotFileName}.${process.pid}.tmp`,
    );
    await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o644,
    });
    await rename(temporary, target);

    return snapshot;
  }

  private async read(): Promise<PublicStatusSnapshot | null> {
    if (!this.outputDirectory) {
      return null;
    }

    try {
      return JSON.parse(
        await readFile(join(this.outputDirectory, SnapshotFileName), "utf8"),
      ) as PublicStatusSnapshot;
    } catch {
      return null;
    }
  }
}
