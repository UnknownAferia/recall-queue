import type { MetadataRoute } from "next";

const routes = [
  "",
  "/live",
  "/how-it-works",
  "/rating",
  "/seasons",
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
    changeFrequency: index === 0 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : route === "/how-it-works" ? 0.9 : 0.7,
  }));
}
