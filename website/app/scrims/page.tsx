import type { Metadata } from "next";

import { DiscordCta } from "../components/DiscordCta";
import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Vora Scrims",
  description:
    "Find another five-player Mobile Legends team for an organized custom game.",
  alternates: { canonical: "/scrims" },
};

export default function ScrimsPage() {
  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="VORA SCRIMS"
        title="Your five. Their five. One organized game."
        description="Vora Scrims gives complete teams a simple, private way to advertise availability and find an opponent for a Mobile Legends custom game."
      />
      <section className="content-section page-shell scrims-page">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">DISCORD FIRST</p>
            <h2>From listing to lobby.</h2>
          </div>
          <p>
            Vora does not organize wagers, collect payments or replace
            tournament administration. Captains agree on the format directly.
          </p>
        </div>
        <div className="scrim-steps">
          {[
            ["01", "Publish availability", "Use /scrim create with your team name, region and timezone-aware availability."],
            ["02", "Browse opponents", "Use /scrim browse and filter by region. Only active seven-day listings appear."],
            ["03", "Contact the captain", "Reach out privately, agree on rules and schedule the Mobile Legends custom lobby."],
            ["04", "Close the listing", "Use /scrim close once an opponent is found or plans change."],
          ].map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <DiscordCta source="scrims-final" />
      <SiteFooter />
    </main>
  );
}
