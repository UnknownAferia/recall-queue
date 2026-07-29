import type { Metadata } from "next";

import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { readPublicStatusSnapshot } from "../lib/publicStatus";

export const metadata: Metadata = {
  title: "Service Status",
  description:
    "Current Vora service availability, recent uptime and incident history.",
  alternates: { canonical: "/status" },
};

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default async function StatusPage() {
  const snapshot = await readPublicStatusSnapshot();
  const condition = snapshot?.condition ?? "outage";
  const history = snapshot?.history.slice(-30) ?? [];
  const checks = history.reduce((sum, day) => sum + day.checks, 0);
  const successes = history.reduce(
    (sum, day) => sum + day.successfulChecks,
    0,
  );
  const uptime = checks === 0 ? null : (successes / checks) * 100;

  return (
    <main className="interior-page">
      <SiteHeader />
      <PageHero
        eyebrow="VORA STATUS"
        title={
          condition === "operational"
            ? "All systems operational."
            : condition === "degraded"
              ? "Some systems are degraded."
              : "Service interruption detected."
        }
        description="A transparent view of Vora Core, Community and matchmaking availability."
      />

      <section className="content-section page-shell status-page">
        <div className={`status-banner status-${condition}`}>
          <span aria-hidden="true" />
          <div>
            <strong>{condition.toUpperCase()}</strong>
            <p>
              Last checked{" "}
              {snapshot ? `${formatDate(snapshot.generatedAt)} UTC` : "pending"}
            </p>
          </div>
          <b>{uptime === null ? "—" : `${uptime.toFixed(2)}%`} / 30 days</b>
        </div>

        <div className="status-services">
          {[
            ["Website", snapshot?.services.website ?? "operational"],
            ["Community Bot", snapshot?.services.community ?? "outage"],
            ["Vora Core", snapshot?.services.core ?? "outage"],
            ["Matchmaking", snapshot?.services.matchmaking ?? "offline"],
          ].map(([name, state]) => (
            <article key={name}>
              <div>
                <h2>{name}</h2>
                <p>{state}</p>
              </div>
              <span className={`service-dot service-${state}`} />
            </article>
          ))}
        </div>

        <section className="status-history">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow">30 DAY HISTORY</p>
              <h2>Availability at a glance.</h2>
            </div>
            <p>Each bar summarizes the automated checks recorded that day.</p>
          </div>
          <div className="uptime-bars" aria-label="Thirty-day uptime">
            {history.length === 0 ? (
              <p>No history has been recorded yet.</p>
            ) : (
              history.map((day) => {
                const ratio =
                  day.checks === 0 ? 0 : day.successfulChecks / day.checks;
                return (
                  <span
                    key={day.date}
                    className={
                      ratio === 1
                        ? "bar-good"
                        : ratio === 0
                          ? "bar-down"
                          : "bar-partial"
                    }
                    title={`${day.date}: ${(ratio * 100).toFixed(1)}%`}
                  />
                );
              })
            )}
          </div>
        </section>

        <section className="status-incidents">
          <p className="eyebrow">RECENT INCIDENTS</p>
          <h2>Operational history.</h2>
          {snapshot?.incidents.length ? (
            snapshot.incidents.map((incident) => (
              <article key={incident.id}>
                <span className={`service-dot service-${incident.impact}`} />
                <div>
                  <h3>{incident.title}</h3>
                  <p>
                    Began {formatDate(incident.startedAt)} UTC ·{" "}
                    {incident.resolvedAt
                      ? `Resolved ${formatDate(incident.resolvedAt)} UTC`
                      : "Investigating"}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <p className="status-empty">
              No incidents have been recorded in the current history window.
            </p>
          )}
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}
