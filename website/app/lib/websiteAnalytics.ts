import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const trackedPagePaths = [
  "/",
  "/get-started",
  "/live",
  "/status",
  "/how-it-works",
  "/rating",
  "/seasons",
  "/updates",
  "/wrapped",
  "/draft",
  "/scrims",
  "/faq",
  "/support",
  "/privacy",
  "/terms",
] as const;

export type TrackedPagePath = (typeof trackedPagePaths)[number];

export const discordCtaSources = [
  "home-role-identity",
  "home-final",
  "get-started-hero",
  "get-started-final",
  "live-status",
  "live-final",
  "how-it-works-final",
  "rating-final",
  "seasons-final",
  "updates-final",
  "faq-final",
  "scrims-final",
  "support",
  "footer",
] as const;

export type DiscordCtaSource = (typeof discordCtaSources)[number];

interface WebsiteAnalyticsDay {
  readonly pageViews: Record<string, number>;
  readonly discordClicks: Record<string, number>;
}

interface WebsiteAnalyticsFile {
  readonly schemaVersion: 1;
  readonly updatedAt: string;
  readonly days: Record<string, WebsiteAnalyticsDay>;
}

const retentionDays = 90;
let writeQueue = Promise.resolve();

function analyticsFilePath(): string {
  return (
    process.env.VORA_WEBSITE_ANALYTICS_FILE ??
    path.join(process.cwd(), ".data", "website-conversions.json")
  );
}

function createEmptyFile(): WebsiteAnalyticsFile {
  return {
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
    days: {},
  };
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

async function readAnalyticsFile(filePath: string): Promise<WebsiteAnalyticsFile> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
    return isAnalyticsFile(parsed) ? parsed : createEmptyFile();
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return createEmptyFile();
    }

    throw error;
  }
}

function pruneDays(
  days: Record<string, WebsiteAnalyticsDay>,
  now: Date,
): Record<string, WebsiteAnalyticsDay> {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - (retentionDays - 1));
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  return Object.fromEntries(
    Object.entries(days).filter(([day]) => day >= cutoffKey),
  );
}

async function updateCounter(
  collection: keyof WebsiteAnalyticsDay,
  key: string,
  now = new Date(),
): Promise<void> {
  const filePath = analyticsFilePath();
  const current = await readAnalyticsFile(filePath);
  const dayKey = now.toISOString().slice(0, 10);
  const currentDay = current.days[dayKey] ?? {
    pageViews: {},
    discordClicks: {},
  };
  const nextCollection = {
    ...currentDay[collection],
    [key]: (currentDay[collection][key] ?? 0) + 1,
  };
  const days = pruneDays(
    {
      ...current.days,
      [dayKey]: {
        ...currentDay,
        [collection]: nextCollection,
      },
    },
    now,
  );
  const next: WebsiteAnalyticsFile = {
    schemaVersion: 1,
    updatedAt: now.toISOString(),
    days,
  };
  const temporaryPath = `${filePath}.${process.pid}.tmp`;

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

function enqueueUpdate(update: () => Promise<void>): Promise<void> {
  const scheduled = writeQueue.then(update, update);
  writeQueue = scheduled.catch(() => undefined);
  return scheduled;
}

export function isTrackedPagePath(value: string): value is TrackedPagePath {
  return trackedPagePaths.includes(value as TrackedPagePath);
}

export function isDiscordCtaSource(
  value: string,
): value is DiscordCtaSource {
  return discordCtaSources.includes(value as DiscordCtaSource);
}

export function discordCtaHref(source: DiscordCtaSource): string {
  return `/go/discord?source=${encodeURIComponent(source)}`;
}

export function recordPageView(page: TrackedPagePath): Promise<void> {
  return enqueueUpdate(() => updateCounter("pageViews", page));
}

export function recordDiscordClick(source: DiscordCtaSource): Promise<void> {
  return enqueueUpdate(() => updateCounter("discordClicks", source));
}
