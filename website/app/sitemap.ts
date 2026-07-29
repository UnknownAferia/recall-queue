import type { MetadataRoute } from "next";

const routes = [
  "",
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

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-27T00:00:00.000Z");

  return routes.map((route, index) => ({
    url: `https://voramlbb.com${route}`,
    lastModified,
    changeFrequency:
      index === 0 || route === "/live" || route === "/updates"
        ? "weekly"
        : "monthly",
    priority:
      index === 0
        ? 1
        : route === "/how-it-works" || route === "/get-started"
          ? 0.9
          : route === "/live" || route === "/updates"
            ? 0.8
            : 0.7,
  }));
}
