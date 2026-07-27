import type { Metadata } from "next";
import { DiscordCta } from "../components/DiscordCta";
import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "RSR & Divisions",
  description:
    "Understand Vora's Ranked Skill Rating, placements, confidence and competitive divisions.",
};

const divisions = [
  { name: "Bronze", minimum: "0+", tone: "bronze" },
  { name: "Silver", minimum: "900+", tone: "silver" },
  { name: "Gold", minimum: "1,100+", tone: "gold" },
  { name: "Platinum", minimum: "1,300+", tone: "platinum" },
  { name: "Diamond", minimum: "1,500+", tone: "diamond" },
  { name: "Master", minimum: "1,750+", tone: "master" },
  { name: "Apex", minimum: "2,000+", tone: "apex" },
] as const;

export default function RatingPage() {
  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="RANKED SKILL RATING"
        title="A rating built around verified team outcomes."
        description="RSR measures competitive results. Confidence controls how quickly the system adapts while placements establish a reliable starting point."
      />

      <section className="content-section page-shell">
        <div className="metric-grid">
          <article>
            <span>RSR</span>
            <h2>Your competitive rating</h2>
            <p>
              Wins and losses change RSR according to the expected result,
              squad strength and how established your rating is.
            </p>
          </article>
          <article>
            <span>10</span>
            <h2>Placement matches</h2>
            <p>
              New players complete ten verified matches before receiving a
              public division. Early movement is deliberately more responsive.
            </p>
          </article>
          <article>
            <span>0–100%</span>
            <h2>Rating confidence</h2>
            <p>
              Confidence describes how certain Vora is about the current
              rating. It rises as verified competitive history grows.
            </p>
          </article>
        </div>
      </section>

      <section className="content-band">
        <div className="page-shell">
          <div className="section-heading">
            <p className="eyebrow">COMPETITIVE DIVISIONS</p>
            <h2>Every threshold is public.</h2>
            <p>
              Divisions appear after placements and are mirrored by cosmetic
              Discord roles. They do not grant extra permissions.
            </p>
          </div>
          <div className="division-grid">
            {divisions.map((division) => (
              <article className={`division-card ${division.tone}`} key={division.name}>
                <span className="division-gem" aria-hidden="true" />
                <div>
                  <strong>Vora {division.name}</strong>
                  <small>{division.minimum} RSR</small>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section page-shell">
        <div className="split-content">
          <div>
            <p className="eyebrow">WHAT CHANGES RSR</p>
            <h2>The team wins or loses together.</h2>
          </div>
          <div className="prose">
            <p>
              Only verified outcomes can update RSR. A win against a stronger
              squad is worth more than an expected win; established ratings
              move less aggressively than new ones.
            </p>
            <p>
              KDA, MVP labels and damage numbers do not directly change RSR.
              Different roles contribute in different ways, and Vora does not
              have access to a public Moonton match-data API.
            </p>
            <p>
              Behavior and competitive integrity are tracked separately.
              Reliability can affect access and sanctions, but it is never
              disguised as player skill.
            </p>
          </div>
        </div>
      </section>

      <DiscordCta />
      <SiteFooter />
    </main>
  );
}
