import type { Metadata } from "next";
import { DiscordCta } from "../components/DiscordCta";
import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Seasons & Progression",
  description:
    "Learn how Vora seasons, soft resets, seasonal rankings and achievements preserve long-term competitive progress.",
};

const lifecycle = [
  {
    label: "START",
    title: "A fresh seasonal rating",
    copy: "The season begins around its configured baseline. A soft reset keeps part of established performance without permanently locking the ladder.",
  },
  {
    label: "PLAY",
    title: "Verified matches build standing",
    copy: "Eligible results update lifetime and seasonal progress together. Placements and confidence still protect rating quality.",
  },
  {
    label: "CLIMB",
    title: "One live seasonal leaderboard",
    copy: "Players are ranked by qualified seasonal performance while lifetime RSR remains visible as the long-term competitive signal.",
  },
  {
    label: "FINISH",
    title: "Final standings are frozen",
    copy: "At completion, ranks and achievements are preserved in season history before the next competitive cycle begins.",
  },
] as const;

export default function SeasonsPage() {
  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="SEASONS & PROGRESSION"
        title="A reason to climb without erasing your history."
        description="Vora separates lifetime skill from seasonal competition, preserving long-term progress while every season creates a new race."
      />

      <section className="content-section page-shell">
        <div className="section-heading">
          <p className="eyebrow">THE SEASON LIFECYCLE</p>
          <h2>Start, compete, finish, remember.</h2>
        </div>
        <div className="lifecycle-grid">
          {lifecycle.map((stage, index) => (
            <article key={stage.label}>
              <div className="lifecycle-number">0{index + 1}</div>
              <span>{stage.label}</span>
              <h3>{stage.title}</h3>
              <p>{stage.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-band">
        <div className="page-shell split-content">
          <div>
            <p className="eyebrow">TWO VIEWS OF PROGRESS</p>
            <h2>Lifetime skill and seasonal form.</h2>
          </div>
          <div className="comparison-grid">
            <article>
              <span>LIFETIME</span>
              <h3>Your lasting competitive record</h3>
              <p>
                RSR, match history, peak rating and established confidence
                represent performance across Vora.
              </p>
            </article>
            <article>
              <span>SEASONAL</span>
              <h3>Your performance in one cycle</h3>
              <p>
                Seasonal rating, rank, peak and completed-match count create a
                focused competition with a defined finish.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="content-section page-shell">
        <div className="section-heading">
          <p className="eyebrow">RECOGNITION</p>
          <h2>Achievements remain after the season ends.</h2>
          <p>
            Season Champion, Season Top 10 and Season Veteran rewards are
            represented by cosmetic Discord roles and recorded in personal
            season history.
          </p>
        </div>
        <div className="achievement-row">
          <article>
            <span>01</span>
            <strong>Season Champion</strong>
            <p>Final rank number one.</p>
          </article>
          <article>
            <span>10</span>
            <strong>Season Top 10</strong>
            <p>A top-ten final standing.</p>
          </article>
          <article>
            <span>V</span>
            <strong>Season Veteran</strong>
            <p>Meaningful participation throughout the season.</p>
          </article>
        </div>
      </section>

      <DiscordCta source="seasons-final" />
      <SiteFooter />
    </main>
  );
}
