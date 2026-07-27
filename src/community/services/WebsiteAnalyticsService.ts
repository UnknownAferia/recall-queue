import { readFile } from "node:fs/promises";

interface WebsiteAnalyticsDay {
  readonly pageViews: Readonly<Record<string, number>>;
  readonly discordClicks: Readonly<Record<string, number>>;
}

interface WebsiteAnalyticsFile {
  readonly schemaVersion: 1;
  readonly updatedAt: string;
  readonly days: Readonly<Record<string, WebsiteAnalyticsDay>>;
}

export interface WebsiteAnalyticsSource {
  readonly source: string;
  readonly clicks: number;
}

export interface WebsiteAnalyticsSnapshot {
  readonly periodDays: number;
  readonly pageViews: number;
  readonly landingPageViews: number;
  readonly getStartedViews: number;
  readonly discordClicks: number;
  readonly getStartedDiscordClicks: number;
  readonly pageToDiscordRate: number;
  readonly onboardingToDiscordRate: number;
  readonly topSources: readonly WebsiteAnalyticsSource[];
  readonly updatedAt: Date;
}

function isCounterRecord(value: unknown): value is Record<string, number> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every(
      (counter) =>
        typeof counter === "number" &&
        Number.isSafeInteger(counter) &&
        counter >= 0,
    )
  );
}

function isAnalyticsFile(value: unknown): value is WebsiteAnalyticsFile {
  if (
    typeof value !== "object" ||
    value === null ||
    !("schemaVersion" in value) ||
    value.schemaVersion !== 1 ||
    !("updatedAt" in value) ||
    typeof value.updatedAt !== "string" ||
    !("days" in value) ||
    typeof value.days !== "object" ||
    value.days === null
  ) {
    return false;
  }

  return Object.values(value.days).every(
    (day) =>
      typeof day === "object" &&
      day !== null &&
      "pageViews" in day &&
      "discordClicks" in day &&
      isCounterRecord(day.pageViews) &&
      isCounterRecord(day.discordClicks),
  );
}

function sumCounters(counters: Readonly<Record<string, number>>): number {
  return Object.values(counters).reduce((total, value) => total + value, 0);
}

function percentage(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
}

export class WebsiteAnalyticsService {
  public constructor(
    private readonly filePath =
      process.env.VORA_WEBSITE_ANALYTICS_FILE ??
      "/app/website-analytics/website-conversions.json",
    private readonly periodDays = 30,
  ) {}

  public async getSnapshot(
    now = new Date(),
  ): Promise<WebsiteAnalyticsSnapshot | null> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(this.filePath, "utf8"));
    } catch {
      return null;
    }

    if (!isAnalyticsFile(parsed)) {
      return null;
    }

    const updatedAt = new Date(parsed.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      return null;
    }

    const cutoff = new Date(now);
    cutoff.setUTCDate(cutoff.getUTCDate() - (this.periodDays - 1));
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    const todayKey = now.toISOString().slice(0, 10);
    let pageViews = 0;
    let landingPageViews = 0;
    let getStartedViews = 0;
    let discordClicks = 0;
    let getStartedDiscordClicks = 0;
    const sources: Record<string, number> = {};

    for (const [dayKey, day] of Object.entries(parsed.days)) {
      if (dayKey < cutoffKey || dayKey > todayKey) {
        continue;
      }

      pageViews += sumCounters(day.pageViews);
      landingPageViews += day.pageViews["/"] ?? 0;
      getStartedViews += day.pageViews["/get-started"] ?? 0;
      discordClicks += sumCounters(day.discordClicks);

      for (const [source, clicks] of Object.entries(day.discordClicks)) {
        sources[source] = (sources[source] ?? 0) + clicks;
        if (source.startsWith("get-started-")) {
          getStartedDiscordClicks += clicks;
        }
      }
    }

    return {
      periodDays: this.periodDays,
      pageViews,
      landingPageViews,
      getStartedViews,
      discordClicks,
      getStartedDiscordClicks,
      pageToDiscordRate: percentage(discordClicks, pageViews),
      onboardingToDiscordRate: percentage(
        getStartedDiscordClicks,
        getStartedViews,
      ),
      topSources: Object.entries(sources)
        .map(([source, clicks]) => ({ source, clicks }))
        .sort(
          (left, right) =>
            right.clicks - left.clicks ||
            left.source.localeCompare(right.source),
        )
        .slice(0, 3),
      updatedAt,
    };
  }
}
