import type { Metadata } from "next";

import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { DraftPlanner } from "./DraftPlanner";

export const metadata: Metadata = {
  title: "Vora Draft",
  description:
    "Plan roles, players and hero choices for an existing Mobile Legends five-player team.",
  alternates: { canonical: "/draft" },
};

export default function DraftPage() {
  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="VORA DRAFT"
        title="Turn five players into one plan."
        description="Assign every lane, record first-choice and backup heroes, add team notes and share the complete plan with your squad."
      />
      <section className="content-section page-shell">
        <DraftPlanner />
      </section>
      <SiteFooter />
    </main>
  );
}
