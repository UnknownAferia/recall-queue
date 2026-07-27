import type { Metadata } from "next";

import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { discordCtaHref } from "../lib/websiteAnalytics";

export const metadata: Metadata = {
  title: "Get Started",
  description:
    "Register, verify your Mobile Legends account, choose your roles and become queue-ready in Vora.",
  alternates: {
    canonical: "/get-started",
  },
};

const preparation = [
  {
    label: "DISCORD",
    title: "Your Discord account",
    copy: "Vora runs entirely inside Discord. No launcher or separate player app is required.",
  },
  {
    label: "MLBB",
    title: "Your account details",
    copy: "Have your current in-game name, Player ID and Server ID ready.",
  },
  {
    label: "EVIDENCE",
    title: "One profile screenshot",
    copy: "Use a current MLBB profile screen that clearly shows the same identity details.",
  },
] as const;

const onboardingSteps = [
  {
    number: "01",
    state: "JOIN",
    title: "Enter the Vora Discord",
    copy: "Accept the server rules and open the Register & Verify channel. The public website never asks for your account identifiers.",
  },
  {
    number: "02",
    state: "SUBMIT",
    title: "Create and verify your profile",
    copy: "Click Register & Submit. The private form collects your IGN, Player ID, Server ID and one profile screenshot together.",
  },
  {
    number: "03",
    state: "REVIEW",
    title: "Wait for Operations approval",
    copy: "Operations privately compares the entered identity with the screenshot. You can view your profile while pending, but matchmaking stays locked.",
  },
  {
    number: "04",
    state: "PLAY",
    title: "Choose roles and enter the pool",
    copy: "After approval, open /vora, choose two different preferred roles, join queue-lobby and enter the teammate pool when you are ready to play.",
  },
] as const;

const blockers = [
  {
    question: "My screenshot was rejected",
    answer:
      "Open the rejection reason, take a current profile screenshot where IGN, Player ID and Server ID are readable, then use Submit Verification. Do not register a second account.",
  },
  {
    question: "I am verified but cannot enter the pool",
    answer:
      "Complete both preferred-role choices, join the managed queue-lobby voice channel and check whether matchmaking or your account has an active cooldown.",
  },
  {
    question: "My request appears stuck",
    answer:
      "Open a private support ticket in Discord. Operations can inspect or reset the request without deleting established player history.",
  },
] as const;

export default function GetStartedPage() {
  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="PLAYER ONBOARDING"
        title="From new member to queue-ready."
        description="One private registration flow connects your Mobile Legends identity, unlocks competitive access and prepares Vora to find your five."
      >
        <a
          className="button button-primary"
          href={discordCtaHref("get-started-hero")}
          target="_blank"
          rel="noreferrer"
        >
          Join Vora on Discord
          <span aria-hidden="true">↗</span>
        </a>
        <a className="text-link" href="#checklist">
          View the checklist
          <span aria-hidden="true">↓</span>
        </a>
      </PageHero>

      <section className="content-section page-shell" id="checklist">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">BEFORE YOU START</p>
            <h2>Three things. About five minutes.</h2>
          </div>
          <p>
            Registration is intentionally small. Vora only asks for the
            information needed to create one competitive identity and review
            it safely.
          </p>
        </div>

        <div className="onboarding-preparation">
          {preparation.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-band">
        <div className="page-shell">
          <div className="section-heading">
            <p className="eyebrow">THE COMPLETE SETUP</p>
            <h2>Four steps to your first teammate pool.</h2>
            <p>
              Every sensitive action happens privately. Public channels never
              receive your Player ID, Server ID or verification screenshot.
            </p>
          </div>

          <ol className="onboarding-steps">
            {onboardingSteps.map((step) => (
              <li key={step.number}>
                <span className="onboarding-step-number">{step.number}</span>
                <div className="onboarding-step-copy">
                  <small>{step.state}</small>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="content-section page-shell evidence-section">
        <div className="evidence-art">
          <img
            src="/graphics/steps/player-identity.webp"
            alt="A Vora player identity being verified"
            width="960"
            height="640"
          />
        </div>

        <div className="evidence-copy">
          <p className="eyebrow">A SCREENSHOT THAT PASSES REVIEW</p>
          <h2>Clear identity. Nothing sensitive.</h2>
          <p>
            Open your current Mobile Legends profile and make sure the
            screenshot visibly matches the information entered in the form.
          </p>

          <ul className="evidence-checklist">
            <li>
              <span>01</span>
              Your current in-game name is readable.
            </li>
            <li>
              <span>02</span>
              Player ID and Server ID are both visible.
            </li>
            <li>
              <span>03</span>
              The image is PNG, JPEG or WebP and no larger than 10 MB.
            </li>
            <li>
              <span>04</span>
              No password, login code or authentication detail is included.
            </li>
          </ul>

          <p className="evidence-note">
            Already registered or previously rejected? Use{" "}
            <strong>Submit Verification</strong> instead of creating another
            account.
          </p>
        </div>
      </section>

      <section className="content-band onboarding-access">
        <div className="page-shell split-content">
          <div>
            <p className="eyebrow">AFTER APPROVAL</p>
            <h2>Verification unlocks access—not an automatic queue.</h2>
            <p className="section-copy">
              You remain in control of when you play. Vora only considers you
              after your role identity is complete and you deliberately enter
              the teammate pool.
            </p>
          </div>

          <div className="access-sequence">
            <div>
              <span>1</span>
              <p>
                Open <strong>/vora</strong> and select Preferences.
              </p>
            </div>
            <div>
              <span>2</span>
              <p>Choose different primary and secondary roles.</p>
            </div>
            <div>
              <span>3</span>
              <p>Join the managed queue-lobby voice channel.</p>
            </div>
            <div>
              <span>4</span>
              <p>Enter the pool and stay available for the ready check.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section page-shell">
        <div className="section-heading">
          <p className="eyebrow">COMMON BLOCKERS</p>
          <h2>If something does not unlock.</h2>
        </div>

        <div className="onboarding-faq">
          {blockers.map((blocker) => (
            <details key={blocker.question}>
              <summary>{blocker.question}</summary>
              <p>{blocker.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="final-cta compact-cta">
        <div className="final-glow" aria-hidden="true" />
        <div className="page-shell">
          <p className="eyebrow">READY WHEN YOU ARE</p>
          <h2>Create your Vora identity.</h2>
          <p>
            Join Discord, open Register & Verify and complete the private form.
          </p>
          <a
            className="button button-primary"
            href={discordCtaHref("get-started-final")}
            target="_blank"
            rel="noreferrer"
          >
            Start on Discord
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
