import type { Metadata } from "next";
import Image from "next/image";

import {
  readControlSnapshot,
  type ControlSnapshot,
} from "../lib/controlSnapshot";
import {
  getControlAuthConfig,
  getControlSession,
  type ControlSession,
} from "../lib/controlAuth";

export const metadata: Metadata = {
  title: "Vora Control",
  description: "Private operational overview for Vora.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export const dynamic = "force-dynamic";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "No heartbeat";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function Metric({
  label,
  value,
  detail,
  attention = false,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly detail: string;
  readonly attention?: boolean;
}) {
  return (
    <article
      className={attention ? "control-metric attention" : "control-metric"}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function ServiceCard({
  name,
  service,
}: {
  readonly name: string;
  readonly service: ControlSnapshot["services"]["core"];
}) {
  return (
    <article className="control-service">
      <div>
        <span
          className={`control-light ${service.status}`}
          aria-hidden="true"
        />
        <strong>{name}</strong>
      </div>
      <b>{service.status}</b>
      <time dateTime={service.heartbeatAt ?? undefined}>
        {formatDateTime(service.heartbeatAt)} UTC
      </time>
    </article>
  );
}

function ControlBrand() {
  return (
    <a href="/" className="control-brand" aria-label="Return to Vora">
      <Image
        src="/brand/vora-mark.png"
        alt=""
        width={36}
        height={36}
        priority
      />
      <span>VORA</span>
      <b>CONTROL</b>
    </a>
  );
}

function authenticationMessage(status: string | undefined): string {
  switch (status) {
    case "forbidden":
      return "Your Discord account does not have an authorized Vora staff role.";
    case "invalid":
      return "The sign-in request expired or could not be validated. Please try again.";
    case "failed":
      return "Discord sign-in could not be completed. Please try again.";
    case "unavailable":
      return "Discord sign-in is not configured for this deployment.";
    default:
      return "Continue with Discord to verify your Vora staff access.";
  }
}

function ControlLogin({
  configured,
  status,
}: {
  readonly configured: boolean;
  readonly status?: string;
}) {
  return (
    <main className="control-page">
      <header className="control-header">
        <ControlBrand />
        <div className="control-sync stale">
          <span aria-hidden="true" />
          Staff identity required
        </div>
      </header>
      <section className="control-login-shell">
        <article className="control-login-card">
          <p className="eyebrow">PRIVATE OPERATIONS</p>
          <h1>Identify before entering.</h1>
          <p>
            Vora Control is restricted to the server owner and authorized Core
            or Operations staff.
          </p>
          <div
            className={
              status && status !== "unavailable"
                ? "control-auth-message attention"
                : "control-auth-message"
            }
            role={status ? "alert" : undefined}
          >
            {authenticationMessage(status)}
          </div>
          {configured ? (
            <a className="control-discord-login" href="/control/auth/login">
              Continue with Discord
              <span aria-hidden="true">→</span>
            </a>
          ) : (
            <p className="control-auth-unavailable">
              Contact the Vora administrator to complete authentication setup.
            </p>
          )}
          <small>
            Discord is used only to confirm your identity, server membership and
            staff authorization.
          </small>
        </article>
      </section>
    </main>
  );
}

function ControlOperator({ session }: { readonly session: ControlSession }) {
  return (
    <div className="control-operator">
      <div>
        <span>AUTHORIZED OPERATOR</span>
        <strong>{session.displayName}</strong>
      </div>
      <a href="/control/auth/logout">Sign out</a>
    </div>
  );
}

export default async function ControlPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly auth?: string }>;
}) {
  const session = await getControlSession();
  const { auth } = await searchParams;

  if (!session) {
    return (
      <ControlLogin
        configured={getControlAuthConfig() !== null}
        status={auth}
      />
    );
  }

  const { snapshot, stale } = await readControlSnapshot();
  const unavailable = !snapshot || stale;

  return (
    <main className="control-page">
      <header className="control-header">
        <ControlBrand />
        <div className="control-header-status">
          <div className={unavailable ? "control-sync stale" : "control-sync"}>
            <span aria-hidden="true" />
            {unavailable ? "Snapshot unavailable" : "Live operational snapshot"}
          </div>
          <ControlOperator session={session} />
        </div>
      </header>

      <section className="control-shell">
        <div className="control-intro">
          <div>
            <p className="eyebrow">PRIVATE OPERATIONS</p>
            <h1>Vora at a glance.</h1>
            <p>
              Registration, conversion, teammate-pool activity, moderation and
              service health without exposing player identities.
            </p>
          </div>
          <div className="control-updated">
            <span>LAST SYNCHRONIZED</span>
            <strong>
              {snapshot
                ? `${formatDateTime(snapshot.generatedAt)} UTC`
                : "Waiting for Community"}
            </strong>
            <p>{snapshot?.communityName ?? "Vora Community"}</p>
          </div>
        </div>

        {unavailable ? (
          <section className="control-unavailable" role="alert">
            <p className="eyebrow">DATA PIPELINE</p>
            <h2>Control data is not current.</h2>
            <p>
              Vora Community will publish the first private operational snapshot
              during its next status synchronization.
            </p>
          </section>
        ) : null}

        <section className="control-section">
          <div className="control-section-heading">
            <div>
              <p className="eyebrow">SYSTEM HEALTH</p>
              <h2>Core services</h2>
            </div>
            <span>
              Registration{" "}
              {snapshot?.access.registrationOpen ? "open" : "paused"}
              {" · "}
              Matchmaking {snapshot?.access.matchmakingOpen ? "open" : "paused"}
            </span>
          </div>
          <div className="control-service-grid">
            {snapshot ? (
              <>
                <ServiceCard
                  name="Vora Core"
                  service={snapshot.services.core}
                />
                <ServiceCard
                  name="Vora Community"
                  service={snapshot.services.community}
                />
              </>
            ) : (
              <p className="control-empty">
                No service heartbeat is available.
              </p>
            )}
          </div>
          {snapshot?.access.maintenanceReason ? (
            <p className="control-maintenance">
              {snapshot.access.maintenanceReason}
            </p>
          ) : null}
        </section>

        <section className="control-section">
          <div className="control-section-heading">
            <div>
              <p className="eyebrow">PLAYER FUNNEL</p>
              <h2>Registration and verification</h2>
            </div>
            <span>{snapshot?.players.verificationRate ?? 0}% verified</span>
          </div>
          <div className="control-metric-grid">
            <Metric
              label="REGISTERED"
              value={snapshot?.players.registered ?? "—"}
              detail="player profiles"
            />
            <Metric
              label="VERIFIED"
              value={snapshot?.players.verified ?? "—"}
              detail="queue eligible"
            />
            <Metric
              label="PENDING"
              value={snapshot?.players.pendingVerification ?? "—"}
              detail="awaiting Operations"
              attention={(snapshot?.players.pendingVerification ?? 0) > 0}
            />
            <Metric
              label="REJECTED"
              value={snapshot?.players.rejectedVerification ?? "—"}
              detail="needs resubmission"
            />
          </div>
        </section>

        <section className="control-two-column">
          <div className="control-section">
            <div className="control-section-heading">
              <div>
                <p className="eyebrow">TEAMMATE POOL</p>
                <h2>Queue activity</h2>
              </div>
            </div>
            <div className="control-compact-grid">
              <Metric
                label="WAITING"
                value={snapshot?.queue.waitingPlayers ?? "—"}
                detail="players"
              />
              <Metric
                label="READY"
                value={snapshot?.queue.readyChecks ?? "—"}
                detail="checks"
              />
              <Metric
                label="ACTIVE"
                value={snapshot?.queue.activeSquads ?? "—"}
                detail="squads"
              />
              <Metric
                label="RESULTS"
                value={snapshot?.queue.pendingResults ?? "—"}
                detail="pending"
              />
            </div>
          </div>

          <div className="control-section">
            <div className="control-section-heading">
              <div>
                <p className="eyebrow">OPERATIONS INBOX</p>
                <h2>Attention required</h2>
              </div>
            </div>
            <div className="control-compact-grid">
              <Metric
                label="REPORTS"
                value={snapshot?.moderation.openReports ?? "—"}
                detail="open"
                attention={(snapshot?.moderation.openReports ?? 0) > 0}
              />
              <Metric
                label="CASES"
                value={snapshot?.moderation.pendingCases ?? "—"}
                detail="pending"
                attention={(snapshot?.moderation.pendingCases ?? 0) > 0}
              />
              <Metric
                label="TICKETS"
                value={snapshot?.moderation.openTickets ?? "—"}
                detail="open"
                attention={(snapshot?.moderation.openTickets ?? 0) > 0}
              />
              <Metric
                label="DISPUTES"
                value={snapshot?.queue.disputedResults ?? "—"}
                detail="match results"
                attention={(snapshot?.queue.disputedResults ?? 0) > 0}
              />
            </div>
          </div>
        </section>

        <section className="control-section">
          <div className="control-section-heading">
            <div>
              <p className="eyebrow">WEBSITE CONVERSION</p>
              <h2>Last {snapshot?.website?.periodDays ?? 30} days</h2>
            </div>
            <span>Anonymous aggregate measurement</span>
          </div>
          <div className="control-metric-grid">
            <Metric
              label="PAGE VIEWS"
              value={snapshot?.website?.pageViews ?? "—"}
              detail="all tracked pages"
            />
            <Metric
              label="DISCORD CLICKS"
              value={snapshot?.website?.discordClicks ?? "—"}
              detail="join intent"
            />
            <Metric
              label="SITE → DISCORD"
              value={
                snapshot?.website
                  ? `${snapshot.website.pageToDiscordRate}%`
                  : "—"
              }
              detail="conversion"
            />
            <Metric
              label="ONBOARDING → DISCORD"
              value={
                snapshot?.website
                  ? `${snapshot.website.onboardingToDiscordRate}%`
                  : "—"
              }
              detail="guided conversion"
            />
          </div>
        </section>

        <footer className="control-footer">
          Read-only foundation · No player identifiers are included in this
          dashboard.
        </footer>
      </section>
    </main>
  );
}
