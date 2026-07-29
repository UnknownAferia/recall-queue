import type { Metadata } from "next";

import { DiscordCta } from "../components/DiscordCta";
import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Vora Squads",
  description:
    "Bring an existing Mobile Legends squad to Vora for persistent rosters, role coverage, recruitment and organized scrims.",
  alternates: { canonical: "/squads" },
};

const benefits = [
  {
    number: "01",
    title: "One persistent roster",
    copy: "Create the squad once, invite verified members with a short code and keep captaincy, membership and role coverage together.",
  },
  {
    number: "02",
    title: "See what is missing",
    copy: "Vora reads each member's preferred roles and shows which lanes are covered before the squad recruits another player.",
  },
  {
    number: "03",
    title: "Recruit without replacing",
    copy: "Keep your existing identity and community. Publish only the roles you need and use Vora as supporting infrastructure.",
  },
  {
    number: "04",
    title: "Move into organized play",
    copy: "Use the same squad identity for Vora Scrims, seasonal recognition and future squad statistics.",
  },
] as const;

export default function SquadsPage() {
  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="VORA SQUADS"
        title="Keep your squad. Give it better infrastructure."
        description="Persistent rosters, live role coverage, simple member invites and a clear path from recruitment to organized Mobile Legends play."
      />

      <section className="content-section page-shell squads-page">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">BUILT FOR CAPTAINS</p>
            <h2>No spreadsheets. No Discord ID forms.</h2>
          </div>
          <p>
            Captains open one command, create the squad through a guided form
            and share a human-friendly invite code. Members join from the same
            private dashboard.
          </p>
        </div>

        <div className="scrim-steps squad-benefits">
          {benefits.map((benefit) => (
            <article key={benefit.number}>
              <span>{benefit.number}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section page-shell">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">FOUNDING SQUADS</p>
            <h2>Help shape the tools captains actually need.</h2>
          </div>
          <p>
            Complete verified rosters can apply directly from their squad
            dashboard. Founding Captains receive permanent recognition and a
            direct feedback path to Vora Operations.
          </p>
        </div>
        <div className="squad-program-grid">
          <article>
            <strong>1</strong>
            <h3>Create</h3>
            <p>Use <code>/squad</code> and choose Create a Squad.</p>
          </article>
          <article>
            <strong>5</strong>
            <h3>Verify the roster</h3>
            <p>Invite at least five verified members with the generated code.</p>
          </article>
          <article>
            <strong>★</strong>
            <h3>Apply</h3>
            <p>Submit the Founding Squad application from the captain controls.</p>
          </article>
        </div>
      </section>

      <DiscordCta source="squads-final" />
      <SiteFooter />
    </main>
  );
}
