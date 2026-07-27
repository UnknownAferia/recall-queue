const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Vora",
    url: "https://voramlbb.com",
    description:
      "Discord-first teammate formation for Mobile Legends. Find compatible players, complete your five and queue together.",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Vora",
    applicationCategory: "GameApplication",
    operatingSystem: "Discord",
    url: "https://voramlbb.com",
    description:
      "A Discord-first competitive system that forms role-aware five-player Mobile Legends squads.",
  },
] as const;

export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
      }}
    />
  );
}
