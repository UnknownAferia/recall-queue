import type { Metadata } from "next";

import { DiscordCta } from "../components/DiscordCta";
import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Updates",
  description:
    "Follow Vora's public release milestones and the improvements shaping competitive teammate formation.",
  alternates: {
    canonical: "/updates",
  },
};

const releases = [
  {
    date: "27 JUL 2026",
    label: "OFFICIAL RELEASE",
    title: "Vora is live.",
    copy: "Vora launched as a production Discord service with dedicated Core and Community bots, a public website, HTTPS, health monitoring and verified backup procedures.",
    highlights: [
      "Production infrastructure on a dedicated VPS",
      "Live service status and public leaderboards",
      "Automated server setup, recovery and launch auditing",
    ],
  },
  {
    date: "PLAYER ACCESS",
    label: "ONBOARDING",
    title: "One guided path into competition.",
    copy: "Registration and account evidence now enter one private workflow. Operations can review identities, resolve stuck requests and remind eligible members without exposing account details publicly.",
    highlights: [
      "Combined registration and screenshot submission",
      "Private Operations review and account administration",
      "Conversion overview and controlled reminder batches",
    ],
  },
  {
    date: "TEAM FORMATION",
    label: "COMPETITIVE CORE",
    title: "A complete five, built with intent.",
    copy: "The formation engine assembles one Mobile Legends squad from compatible players. Role preferences, rating context and reliability guide the lineup before a timed ready check reveals the team.",
    highlights: [
      "Role-aware five-player squad formation",
      "Ready checks, cooldowns and private squad voice",
      "Evidence-backed result verification and progression",
    ],
  },
  {
    date: "LIVE COMMUNITY",
    label: "ACTIVATION",
    title: "Competition players can see and join.",
    copy: "Live service information, voluntary Squad Alerts and planned community sessions make it easier to know when teammates are available without relying on disruptive public mentions.",
    highlights: [
      "Opt-in queue and session notifications",
      "Current season, pool and leaderboard visibility",
      "Anonymous aggregate website conversion analytics",
    ],
  },
] as const;

export default function UpdatesPage() {
  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="VORA RELEASE LOG"
        title="What shipped. What changed. What comes next."
        description="A public record of the systems that make Vora safer, clearer and more useful for Mobile Legends players."
      />

      <section className="content-section page-shell updates-section">
        <div className="updates-intro">
          <p className="eyebrow">RELEASED IN PRODUCTION</p>
          <h2>Built around the real player journey.</h2>
          <p>
            Every milestone below is active in Vora today. This page focuses
            on delivered capabilities, not promises or a speculative feature
            list.
          </p>
        </div>

        <ol className="release-timeline">
          {releases.map((release, index) => (
            <li key={release.title}>
              <div className="release-marker" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </div>
              <article>
                <div className="release-meta">
                  <span>{release.label}</span>
                  <time>{release.date}</time>
                </div>
                <h3>{release.title}</h3>
                <p>{release.copy}</p>
                <ul>
                  {release.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section className="content-band">
        <div className="page-shell updates-next">
          <div>
            <p className="eyebrow">WHAT WE ARE IMPROVING NEXT</p>
            <h2>Real usage decides the next release.</h2>
          </div>
          <div>
            <p>
              Vora is now in its operating phase. The next improvements will
              be driven by queue participation, completion rates, support
              patterns and direct community feedback.
            </p>
            <a className="text-link" href="/support">
              Share feedback or get help
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      <DiscordCta source="updates-final" />
      <SiteFooter />
    </main>
  );
}
