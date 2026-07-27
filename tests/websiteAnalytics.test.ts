import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import { WebsiteAnalyticsService } from "../src/community/services/WebsiteAnalyticsService.js";

const temporaryDirectories: string[] = [];

async function createAnalyticsFile(data: unknown): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "vora-analytics-"));
  temporaryDirectories.push(directory);
  const filePath = path.join(directory, "website-conversions.json");
  await writeFile(filePath, JSON.stringify(data), "utf8");
  return filePath;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("WebsiteAnalyticsService", () => {
  it("summarizes the rolling website conversion window", async () => {
    const filePath = await createAnalyticsFile({
      schemaVersion: 1,
      updatedAt: "2026-07-27T12:00:00.000Z",
      days: {
        "2026-07-27": {
          pageViews: {
            "/": 20,
            "/get-started": 8,
            "/live": 2,
          },
          discordClicks: {
            "get-started-hero": 5,
            "home-final": 2,
          },
        },
        "2026-07-01": {
          pageViews: {
            "/": 10,
            "/get-started": 2,
          },
          discordClicks: {
            "home-final": 1,
          },
        },
        "2026-06-01": {
          pageViews: {
            "/": 100,
          },
          discordClicks: {
            "home-final": 100,
          },
        },
      },
    });

    const snapshot = await new WebsiteAnalyticsService(filePath).getSnapshot(
      new Date("2026-07-27T18:00:00.000Z"),
    );

    assert.deepEqual(snapshot, {
      periodDays: 30,
      pageViews: 42,
      landingPageViews: 30,
      getStartedViews: 10,
      discordClicks: 8,
      getStartedDiscordClicks: 5,
      pageToDiscordRate: 19,
      onboardingToDiscordRate: 50,
      topSources: [
        { source: "get-started-hero", clicks: 5 },
        { source: "home-final", clicks: 3 },
      ],
      updatedAt: new Date("2026-07-27T12:00:00.000Z"),
    });
  });

  it("treats unavailable or malformed measurement as non-fatal", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "vora-analytics-"));
    temporaryDirectories.push(directory);
    const missingFile = path.join(directory, "missing.json");
    const malformedFile = await createAnalyticsFile({
      schemaVersion: 1,
      updatedAt: "not-a-date",
      days: {
        "2026-07-27": {
          pageViews: { "/": -1 },
          discordClicks: {},
        },
      },
    });

    assert.equal(
      await new WebsiteAnalyticsService(missingFile).getSnapshot(),
      null,
    );
    assert.equal(
      await new WebsiteAnalyticsService(malformedFile).getSnapshot(),
      null,
    );
  });
});
