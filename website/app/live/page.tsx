import type { Metadata } from "next";

import { DiscordCta } from "../components/DiscordCta";
import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import {
  readPublicCompetitionState,
  type PublicLeaderboardEntry,
} from "../lib/publicCompetition";

export const metadata: Metadata = {
  title: "Live Competition",
  description:
    "See Vora service availability, teammate-pool activity, the current season and public competitive leaderboards.",
  alternates: {
    canonical: "/live",
  },
};

export const dynamic = "force-dynamic";

import { discordCtaHref } from "../lib/websiteAnalytics";

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "To be announced";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function Leaderboard({
  entries,
  emptyMessage,
}: {
  readonly entries: readonly PublicLeaderboardEntry[];
  readonly emptyMessage: string;
}) {
  if (entries.length === 0) {
    return <p className="live-empty">{emptyMessage}</p>;
  }

  return (
    <ol className="live-leaderboard">
      {entries.map((entry) => (
        <li key={`${entry.rank}-${entry.ign}`}>
          <span className="leaderboard-rank">
            {entry.rank.toString().padStart(2, "0")}
          </span>
          <div>
            <strong>{entry.ign}</strong>
            <span>
              {entry.division} · {entry.matchesPlayed} matches ·{" "}
              {entry.winRate.toFixed(1)}% WR
            </span>
          </div>
          <b>{entry.rsr.toLocaleString("en-US")} RSR</b>
        </li>
      ))}
    </ol>
  );
}

export default async function LiveCompetitionPage() {
  const { snapshot, stale } = await readPublicCompetitionState();
  const effectiveAvailability =
    !snapshot || stale ? "offline" : snapshot.service.availability;
  const availabilityCopy = {
    online: {
      label: "Operational",
      copy: "Vora Core is online and the teammate pool is accepting eligible players.",
    },
    paused: {
      label: "Matchmaking paused",
      copy:
        snapshot?.service.maintenanceReason ||
        "The service is online, but new squad formation is temporarily paused.",
    },
    offline: {
      label: "Live data unavailable",
      copy: stale
        ? "The latest status update is older than expected. Discord remains the source of truth while synchronization recovers."
        : "Vora has not published its first public competition update yet.",
    },
  }[effectiveAvailability];

  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="LIVE COMPETITION"
        title="The state of Vora, right now."
        description="A privacy-safe view of service availability, teammate-pool activity, the current season and competitive standings."
      />

      <section className="content-section page-shell live-overview">
        <div
          className={`live-status live-status-${effectiveAvailability}`}
          role="status"
        >
          <span className="live-status-light" aria-hidden="true" />
          <div>
            <p className="eyebrow">SERVICE STATUS</p>
            <h2>{availabilityCopy.label}</h2>
            <p>{availabilityCopy.copy}</p>
          </div>
          {snapshot ? (
            <time dateTime={snapshot.generatedAt}>
              Updated {formatDateTime(snapshot.generatedAt)} UTC
            </time>
          ) : null}
        </div>

        <div className="live-metrics" aria-label="Live Vora activity">
          <article>
            <span>POOL</span>
            <strong>{snapshot?.pool.waitingPlayers ?? "—"}</strong>
            <p>players waiting</p>
          </article>
          <article>
            <span>READY</span>
            <strong>{snapshot?.pool.readyChecks ?? "—"}</strong>
            <p>ready checks</p>
          </article>
          <article>
            <span>ACTIVE</span>
            <strong>{snapshot?.pool.activeSquads ?? "—"}</strong>
            <p>squads formed</p>
          </article>
          <article>
            <span>ACCESS</span>
            <strong>
              {snapshot?.service.registrationOpen === true
                ? "OPEN"
                : snapshot
                  ? "PAUSED"
                  : "—"}
            </strong>
            <p>registration</p>
          </article>
        </div>

        <div className="live-context-grid">
          <article className="live-context-card">
            <p className="eyebrow">CURRENT SEASON</p>
            {snapshot?.season ? (
              <>
                <h3>
                  Season {snapshot.season.sequence} · {snapshot.season.name}
                </h3>
                <span className="live-pill">{snapshot.season.status}</span>
                <p>
                  {snapshot.season.placementMatches} placement matches · Ends{" "}
                  <time dateTime={snapshot.season.endsAt}>
                    {formatDateTime(snapshot.season.endsAt)} UTC
                  </time>
                </p>
              </>
            ) : (
              <>
                <h3>No season published</h3>
                <p>The next competitive cycle will appear here once scheduled.</p>
              </>
            )}
          </article>

          <article className="live-context-card">
            <p className="eyebrow">NEXT COMMUNITY SESSION</p>
            {snapshot?.nextSession ? (
              <>
                <h3>{snapshot.nextSession.title}</h3>
                <span className="live-pill">{snapshot.nextSession.status}</span>
                <p>
                  <time dateTime={snapshot.nextSession.startsAt}>
                    {formatDateTime(snapshot.nextSession.startsAt)} UTC
                  </time>{" "}
                  to{" "}
                  <time dateTime={snapshot.nextSession.endsAt}>
                    {formatDateTime(snapshot.nextSession.endsAt)} UTC
                  </time>
                </p>
              </>
            ) : (
              <>
                <h3>No session scheduled</h3>
                <p>
                  Follow Squad Alerts in Discord for voluntary queue
                  notifications.
                </p>
              </>
            )}
          </article>
        </div>
      </section>

      <section className="content-band live-rankings">
        <div className="page-shell">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">PUBLIC STANDINGS</p>
              <h2>Progress you can verify.</h2>
            </div>
            <p>
              Only in-game names and competitive statistics appear here.
              Discord identities and Mobile Legends account identifiers stay
              private.
            </p>
          </div>

          <div className="leaderboard-columns">
            <section>
              <div className="leaderboard-heading">
                <span>SEASONAL</span>
                <h3>{snapshot?.season?.name ?? "Current season"}</h3>
              </div>
              <Leaderboard
                entries={snapshot?.seasonalLeaderboard ?? []}
                emptyMessage="Season standings will appear after qualified players complete their placements."
              />
            </section>

            <section>
              <div className="leaderboard-heading">
                <span>LIFETIME</span>
                <h3>All-time RSR</h3>
              </div>
              <Leaderboard
                entries={snapshot?.lifetimeLeaderboard ?? []}
                emptyMessage="Lifetime standings will appear after the first verified competitive results."
              />
            </section>
          </div>

          <a
            className="button button-primary live-join"
            href={discordCtaHref("live-status")}
            target="_blank"
            rel="noreferrer"
          >
            Enter the teammate pool
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <DiscordCta source="live-final" />
      <SiteFooter />
    </main>
  );
}
