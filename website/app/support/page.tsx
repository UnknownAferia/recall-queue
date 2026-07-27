import type { Metadata } from "next";
import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Find the correct Vora support route for account, matchmaking, result and moderation issues.",
};

const routes = [
  {
    title: "General question",
    destination: "Help channel",
    copy: "Use the public Help channel for explanations about registration, roles, queue access, ratings and seasons.",
  },
  {
    title: "Account or verification problem",
    destination: "Private ticket",
    copy: "Open a ticket if your identity is incorrect, verification is stuck or your MLBB account details need Operations review.",
  },
  {
    title: "Disputed or missing result",
    destination: "Private ticket",
    copy: "Include the squad reference, result screenshot and a clear explanation. Do not publish match evidence in public channels.",
  },
  {
    title: "Community conduct",
    destination: "Discord report action",
    copy: "Use Report Message or Report User for harassment, spam and conduct issues. Sensitive context can be added in a private ticket.",
  },
  {
    title: "Sanction appeal",
    destination: "Private ticket",
    copy: "Include the case reference and explain what should be reconsidered. Operations decisions and changes are audited.",
  },
  {
    title: "Service availability",
    destination: "Matchmaking Status",
    copy: "Check the managed status panel before reporting an outage. It displays Core health, pool activity and planned sessions.",
  },
] as const;

export default function SupportPage() {
  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="VORA SUPPORT"
        title="The right help without exposing private information."
        description="Vora support lives in Discord so account context, staff access and case history stay connected."
      >
        <a
          className="button button-primary"
          href="https://discord.gg/voramlbb"
          target="_blank"
          rel="noreferrer"
        >
          Open Vora on Discord
          <span aria-hidden="true">↗</span>
        </a>
      </PageHero>

      <section className="content-section page-shell">
        <div className="support-grid">
          {routes.map((route) => (
            <article key={route.title}>
              <span>{route.destination}</span>
              <h2>{route.title}</h2>
              <p>{route.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-band">
        <div className="page-shell split-content">
          <div>
            <p className="eyebrow">BEFORE YOU SUBMIT</p>
            <h2>Help Operations resolve it quickly.</h2>
          </div>
          <div className="prose">
            <p>
              Include relevant player, squad, match or case references and
              describe the problem in chronological order.
            </p>
            <p>
              Never send passwords, authentication codes or unrelated personal
              information. Upload only the evidence requested by Vora.
            </p>
            <p>
              Avoid opening multiple tickets for the same issue. Continue in
              the existing private channel until the case is resolved.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
