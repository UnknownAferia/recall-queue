import type { Metadata } from "next";
import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description:
    "A plain-language overview of the information Vora processes and why it is needed.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="LAST UPDATED 29 JULY 2026"
        title="Privacy at Vora."
        description="This notice explains, in plain language, which information Vora processes to operate its Discord-first teammate formation service."
      />

      <article className="legal-content page-shell">
        <section>
          <h2>1. Scope</h2>
          <p>
            This notice applies to the Vora website, Vora Discord server, Vora
            Core bot and Vora Community bot. Vora is an independent community
            project and is not affiliated with Moonton.
          </p>
        </section>

        <section>
          <h2>2. Information Vora processes</h2>
          <ul>
            <li>Discord user ID, username, server membership and managed roles.</li>
            <li>MLBB IGN, Player ID, Server ID and submitted profile evidence.</li>
            <li>Role preferences, RSR, confidence, divisions and season history.</li>
            <li>Queue actions, ready checks, squad membership and assigned roles.</li>
            <li>Reported outcomes, confirmations and match-result screenshots.</li>
            <li>Behavior, cooldowns, integrity incidents and moderation records.</li>
            <li>Support tickets, reports, attachments and staff audit actions.</li>
            <li>
              Optional scrim listings containing a captain&apos;s Discord
              identity, team name, region and stated availability.
            </li>
            <li>
              Anonymous daily counts for website page views and Discord button
              clicks.
            </li>
            <li>Basic operational logs needed to secure and maintain the service.</li>
          </ul>
        </section>

        <section>
          <h2>3. Cookie-free website measurement</h2>
          <p>
            The Vora website measures aggregate page views and Discord button
            clicks so Operations can understand where the onboarding journey
            needs improvement. It does not create visitor profiles, set
            analytics cookies or store IP addresses, referrers, device details
            or account identifiers with these counters. Do Not Track is
            respected for page-view measurement. Daily counters are retained
            for up to 90 days.
          </p>
        </section>

        <section>
          <h2>4. Why the information is used</h2>
          <p>
            Vora uses this information to verify player identities, form
            compatible squads, operate ready checks and private voice rooms,
            verify competitive results, calculate progression, protect users,
            investigate disputes and provide support.
          </p>
        </section>

        <section>
          <h2>5. Visibility</h2>
          <p>
            Public Vora surfaces may display player names, ratings, divisions,
            match records, seasonal standing and achievements. Verification
            evidence, result screenshots, private tickets and moderation data
            remain restricted to authorized staff unless disclosure is
            required to resolve a case or comply with law.
          </p>
        </section>

        <section>
          <h2>6. Retention</h2>
          <p>
            Closed ticket channels may remain available for up to 7 days.
            Staff-only ticket transcripts, Community reports and moderation
            cases may be retained for up to 365 days. Match-result evidence and
            related audit records may remain with the competitive match record
            for integrity reviews and appeals. Open scrim listings expire
            automatically after 7 days. Draft plans remain in the browser and
            share URL and are not uploaded to Vora. Operational logs are kept
            only as long as reasonably necessary for security and reliability.
          </p>
        </section>

        <section>
          <h2>7. Service providers</h2>
          <p>
            Vora relies on Discord for community interaction, MongoDB for
            application data, OVHcloud for production infrastructure and the
            domain service. These providers process information under their
            own terms and privacy practices.
          </p>
        </section>

        <section>
          <h2>8. Your choices and requests</h2>
          <p>
            You can leave the Discord server or stop using Vora at any time.
            For access, correction, deletion or privacy questions, open a
            private support ticket. Some competitive and moderation records may
            need to be retained to protect other users, preserve audit
            integrity or satisfy legal obligations.
          </p>
        </section>

        <section>
          <h2>9. Security</h2>
          <p>
            Vora uses access controls, private staff channels, audited
            operations and production backups. No online service can guarantee
            absolute security. Never submit passwords, login codes or
            authentication secrets to Vora.
          </p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>
            Privacy requests are handled through the private ticket system in
            the official Vora Discord server. This keeps the request connected
            to the Discord identity concerned.
          </p>
        </section>
      </article>

      <SiteFooter />
    </main>
  );
}
