import type { Metadata } from "next";
import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The rules that apply when accessing Vora's website, Discord community and competitive systems.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="LAST UPDATED 29 JULY 2026"
        title="Vora Terms of Use."
        description="These terms describe the basic conditions for accessing Vora's website, Discord community and competitive systems."
      />

      <article className="legal-content page-shell">
        <section>
          <h2>1. Acceptance</h2>
          <p>
            By using Vora, you agree to these terms, the published Community
            Guidelines and reasonable Operations instructions. If you do not
            agree, do not register or use Vora matchmaking.
          </p>
        </section>

        <section>
          <h2>2. Service boundaries</h2>
          <p>
            Vora is an independent, Discord-first community service that forms
            five-player Mobile Legends squads. Vora does not operate Mobile
            Legends, provide opposing teams or claim access to a public Moonton
            match-data API. Vora is not affiliated with or endorsed by Moonton.
          </p>
        </section>

        <section>
          <h2>3. Player accounts</h2>
          <ul>
            <li>Register only an MLBB account you are authorized to use.</li>
            <li>Provide truthful, current account information and evidence.</li>
            <li>Do not create duplicate identities or impersonate another player.</li>
            <li>Keep your Discord and MLBB accounts secure.</li>
            <li>Notify Operations if registered information becomes incorrect.</li>
          </ul>
        </section>

        <section>
          <h2>4. Matchmaking participation</h2>
          <p>
            Enter the teammate pool only when ready to play. Participants must
            remain available, answer ready checks, cooperate with assigned
            roles, communicate with the squad and make a genuine effort to
            complete the external MLBB match.
          </p>
        </section>

        <section>
          <h2>5. Competitive integrity</h2>
          <p>
            Result reports, screenshots and confirmations must be truthful.
            Manipulated evidence, false results, collusion, sanction evasion,
            intentional abandonment and abuse of rating or season systems are
            prohibited.
          </p>
        </section>

        <section>
          <h2>6. Community conduct</h2>
          <p>
            Harassment, hate speech, threats, spam, scams, malicious content,
            targeted disruption and exposure of private information are not
            permitted. Discord's own Terms of Service and Community Guidelines
            also apply.
          </p>
        </section>

        <section>
          <h2>7. Scrim listings</h2>
          <p>
            Scrim listings are for captains of existing five-player teams.
            Availability and contact details must be accurate and may not be
            used for spam, impersonation, commercial solicitation or evading
            Vora sanctions. Close a listing once it is no longer needed.
          </p>
        </section>

        <section>
          <h2>8. Enforcement and appeals</h2>
          <p>
            Vora may remove content, cancel sessions, correct competitive
            records, apply cooldowns, restrict matchmaking or suspend access.
            Decisions are based on severity, history and available evidence.
            Appeals can be submitted through a private ticket with the relevant
            case reference.
          </p>
        </section>

        <section>
          <h2>9. Availability and changes</h2>
          <p>
            Vora is provided on an as-available basis. Features may be changed,
            paused or discontinued for security, maintenance, fairness or
            product development. Ratings, divisions and season rules may evolve
            prospectively as the system improves.
          </p>
        </section>

        <section>
          <h2>10. Responsibility</h2>
          <p>
            Players remain responsible for their Discord account, MLBB account,
            in-game conduct and compliance with applicable platform rules. Vora
            is not responsible for actions taken by Moonton, Discord or other
            players outside Vora's reasonable control.
          </p>
        </section>

        <section>
          <h2>11. Contact</h2>
          <p>
            Questions about these terms should be submitted through the private
            ticket system in the official Vora Discord server.
          </p>
        </section>
      </article>

      <SiteFooter />
    </main>
  );
}
