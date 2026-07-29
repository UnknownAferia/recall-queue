import type { Metadata } from "next";

import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { readPublicCompetitionState } from "../lib/publicCompetition";

export const metadata: Metadata = {
  title: "Vora Wrapped",
  description:
    "Create a privacy-safe, shareable competitive card from Vora's public standings.",
  alternates: { canonical: "/wrapped" },
};

export const dynamic = "force-dynamic";

export default async function WrappedPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ player?: string }>;
}) {
  const query = (await searchParams).player?.trim() ?? "";
  const { snapshot } = await readPublicCompetitionState();
  const entries = [
    ...(snapshot?.seasonalLeaderboard ?? []),
    ...(snapshot?.lifetimeLeaderboard ?? []),
  ];
  const player = entries.find(
    (entry) => entry.ign.toLocaleLowerCase() === query.toLocaleLowerCase(),
  );

  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="VORA WRAPPED"
        title="Your season. One shareable card."
        description="Find a player from Vora's privacy-safe public standings and generate a competitive summary without exposing Discord or MLBB account identifiers."
      />

      <section className="content-section page-shell wrapped-page">
        <form className="wrapped-search" action="/wrapped" method="get">
          <label htmlFor="player">Public in-game name</label>
          <div>
            <input
              id="player"
              name="player"
              defaultValue={query}
              placeholder="Enter an IGN from the leaderboard"
              list="wrapped-players"
              required
            />
            <datalist id="wrapped-players">
              {entries.map((entry) => (
                <option key={`${entry.rank}-${entry.ign}`} value={entry.ign} />
              ))}
            </datalist>
            <button className="button button-primary" type="submit">
              Create Wrapped
            </button>
          </div>
        </form>

        {query && !player ? (
          <div className="wrapped-empty">
            <p className="eyebrow">NOT PUBLIC YET</p>
            <h2>No public standing found for “{query}”.</h2>
            <p>
              Wrapped becomes available after a player appears on a seasonal or
              lifetime public leaderboard.
            </p>
          </div>
        ) : null}

        {player ? (
          <div className="wrapped-result">
            <img
              src={`/api/wrapped?player=${encodeURIComponent(player.ign)}`}
              alt={`${player.ign} Vora Wrapped card`}
              width="1200"
              height="630"
            />
            <div>
              <p>
                This card contains only the same competitive data already shown
                on Vora’s public leaderboard.
              </p>
              <a
                className="button button-outline"
                href={`/api/wrapped?player=${encodeURIComponent(player.ign)}&download=1`}
              >
                Download SVG
              </a>
            </div>
          </div>
        ) : null}
      </section>
      <SiteFooter />
    </main>
  );
}
