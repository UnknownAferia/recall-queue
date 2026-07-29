import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/control",
    },
    sitemap: "https://voramlbb.com/sitemap.xml",
    host: "https://voramlbb.com",
  };
}
