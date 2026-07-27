import type { Metadata } from "next";
import { DiscordCta } from "../components/DiscordCta";
import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "How Vora Works",
  description:
    "See how Vora turns verified Mobile Legends players into a complete five-player squad inside Discord.",
};

const journey = [
  {
    number: "01",
    title: "Register your player identity",
    copy: "Open the Register channel and submit your IGN, Player ID, Server ID and one current MLBB profile screenshot through Vora's private form.",
  },
  {
    number: "02",
    title: "Complete Operations review",
    copy: "Vora Operations compares the submitted account information with the screenshot. Matchmaking remains locked until the identity is approved.",
  },
  {
    number: "03",
    title: "Choose your roles",
    copy: "Select two different preferred roles and, optionally, one avoided role. Vora supports EXP, Gold, Mid, Jungle and Roam.",
  },
  {
    number: "04",
    title: "Enter the teammate pool",
    copy: "Join the managed queue-lobby voice channel when you are ready to play, then enter the pool through the Vora Competitive Hub.",
  },
  {
    number: "05",
    title: "Vora forms the five",
    copy: "The formation engine considers role fit, RSR, rating confidence and reliability to create one usable five-player lineup.",
  },
  {
    number: "06",
    title: "Accept the ready check",
    copy: "All five players must answer before the deadline. Missed or declined checks cancel the formation and may apply a temporary cooldown.",
  },
  {
    number: "07",
    title: "Meet in private voice",
    copy: "A successful ready check reveals the assigned roles, creates a private squad voice channel and moves available members into it.",
  },
  {
    number: "08",
    title: "Queue together in MLBB",
    copy: "Your squad creates a five-player lobby in Mobile Legends. Moonton finds the opposing team; Vora does not run an internal 5v5 match.",
  },
  {
    number: "09",
    title: "Verify the outcome",
    copy: "The captain reports the result with a screenshot. Three squad confirmations verify it before rating, statistics and season progress update.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="THE COMPLETE PLAYER JOURNEY"
        title="One clear path from Discord member to squad."
        description="Vora handles identity, role fit, formation and result integrity so your five can focus on playing together."
      />

      <section className="content-section page-shell">
        <div className="section-heading">
          <p className="eyebrow">FROM PROFILE TO PROGRESSION</p>
          <h2>Nine steps. No separate app.</h2>
        </div>
        <ol className="journey-list">
          {journey.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="content-band">
        <div className="page-shell split-content">
          <div>
            <p className="eyebrow">BEFORE YOU ENTER</p>
            <h2>Matchmaking access has requirements.</h2>
          </div>
          <div className="requirement-list">
            <p>
              <strong>Verified identity</strong>
              Your Discord profile must be connected to an approved MLBB
              account.
            </p>
            <p>
              <strong>Complete role preferences</strong>
              Primary and secondary roles must be different.
            </p>
            <p>
              <strong>Ready to play</strong>
              Stay in the queue lobby and be available for the full squad
              lifecycle.
            </p>
            <p>
              <strong>Good standing</strong>
              Active cooldowns or suspensions temporarily block pool access.
            </p>
          </div>
        </div>
      </section>

      <DiscordCta />
      <SiteFooter />
    </main>
  );
}
