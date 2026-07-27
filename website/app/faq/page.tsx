import type { Metadata } from "next";
import { DiscordCta } from "../components/DiscordCta";
import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers about Vora registration, matchmaking, roles, ratings, results, penalties and support.",
  alternates: {
    canonical: "/faq",
  },
};

const questions = [
  {
    question: "Does Vora create internal 5v5 matches?",
    answer:
      "No. Vora creates one compatible five-player squad. That squad queues together in Mobile Legends, where Moonton finds the opposing team.",
  },
  {
    question: "Do I need to install another app?",
    answer:
      "No. Registration, verification, role preferences, queueing, ready checks, squad coordination and result confirmation happen inside Discord.",
  },
  {
    question: "Why does my account need verification?",
    answer:
      "Verification connects one Discord identity to one real MLBB account and helps prevent impersonation, duplicate identities and manipulated competitive records.",
  },
  {
    question: "What must my verification screenshot show?",
    answer:
      "It must be a current MLBB profile screen that clearly shows the IGN, Player ID and Server ID entered in Vora's private registration form.",
  },
  {
    question: "Can I choose my role?",
    answer:
      "You choose a primary role, a different secondary role and an optional avoided role. The formation engine considers all five players before assigning one of each role.",
  },
  {
    question: "How does Vora measure skill?",
    answer:
      "Verified wins and losses update Ranked Skill Rating (RSR). Rating confidence keeps early movement responsive and established ratings more stable.",
  },
  {
    question: "Does KDA change my RSR?",
    answer:
      "No. Vora does not directly reward KDA, MVP labels or damage numbers. Different roles contribute differently, and Vora does not have access to a public Moonton match-data API.",
  },
  {
    question: "What happens if I miss a ready check?",
    answer:
      "The squad formation is cancelled. Missed or declined checks are recorded and can apply an escalating temporary matchmaking cooldown.",
  },
  {
    question: "How is a match result verified?",
    answer:
      "The captain reports the outcome with a screenshot. Three squad members must confirm it before Vora updates rating, statistics and season progress.",
  },
  {
    question: "What if the squad disagrees about the result?",
    answer:
      "The result enters the competitive-integrity workflow. Operations can inspect evidence, uphold or correct the outcome, void the case and apply sanctions where necessary.",
  },
  {
    question: "How do Squad Alerts work?",
    answer:
      "They are voluntary Discord notifications for controlled player-pool milestones and planned community sessions. They replace public @everyone matchmaking pings.",
  },
  {
    question: "Where can I get help?",
    answer:
      "Use the public Help channel for general guidance. Open a private ticket for account problems, appeals, disputed results or sensitive reports.",
  },
] as const;

export default function FaqPage() {
  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="FREQUENTLY ASKED QUESTIONS"
        title="Everything worth knowing before your first queue."
        description="Quick answers about the player journey, competitive systems and getting help."
      />

      <section className="content-section page-shell">
        <div className="faq-grid faq-grid-wide">
          {questions.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <DiscordCta source="faq-final" />
      <SiteFooter />
    </main>
  );
}
