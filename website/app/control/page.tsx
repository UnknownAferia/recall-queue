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
import { ControlActions } from "./ControlActions";

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

const controlViews = [
  "overview",
  "onboarding",
  "matchmaking",
  "integrity",
  "system",
  "actions",
] as const;

type ControlView = (typeof controlViews)[number];
type TrendComparison = ControlSnapshot["trends"]["registrations"];

const viewLabels: Readonly<Record<ControlView, string>> = {
  overview: "Overview",
  onboarding: "Onboarding",
  matchmaking: "Matchmaking",
  integrity: "Integrity",
  system: "System",
  actions: "Actions",
};

function resolveView(value: string | undefined): ControlView {
  return controlViews.includes(value as ControlView)
    ? (value as ControlView)
    : "overview";
}

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

function TrendCard({
  label,
  comparison,
  detail,
}: {
  readonly label: string;
  readonly comparison: TrendComparison | undefined;
  readonly detail: string;
}) {
  if (!comparison) {
    return (
      <Metric label={label} value="—" detail={`No ${detail} trend available`} />
    );
  }

  const delta = comparison.current - comparison.previous;
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const deltaLabel = delta > 0 ? `+${delta}` : delta.toString();

  return (
    <article className="control-trend">
      <span>{label}</span>
      <strong>{comparison.current}</strong>
      <p>{detail} in the current seven-day window</p>
      <small className={direction}>
        {deltaLabel} compared with the previous seven days
      </small>
    </article>
  );
}

function FunnelStage({
  label,
  value,
  total,
  detail,
}: {
  readonly label: string;
  readonly value: number;
  readonly total: number;
  readonly detail: string;
}) {
  const rate = total === 0 ? 0 : Math.round((value / total) * 100);

  return (
    <article className="control-funnel-stage">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <progress max={100} value={rate}>
        {rate}%
      </progress>
      <p>
        {rate}% · {detail}
      </p>
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

function ControlNavigation({ current }: { readonly current: ControlView }) {
  return (
    <nav className="control-navigation" aria-label="Vora Control sections">
      {controlViews.map((view) => (
        <a
          key={view}
          href={view === "overview" ? "/control" : `/control?view=${view}`}
          aria-current={current === view ? "page" : undefined}
        >
          {viewLabels[view]}
        </a>
      ))}
    </nav>
  );
}

function SectionHeading({
  eyebrow,
  title,
  meta,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly meta?: string;
}) {
  return (
    <div className="control-section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {meta ? <span>{meta}</span> : null}
    </div>
  );
}

function Overview({ snapshot }: { readonly snapshot: ControlSnapshot | null }) {
  const attentionTotal = snapshot
    ? snapshot.players.pendingOlderThan48Hours +
      snapshot.moderation.openReports +
      snapshot.moderation.pendingCases +
      snapshot.moderation.openTickets +
      snapshot.queue.disputedResults
    : 0;

  return (
    <>
      <section className="control-metric-grid control-summary-grid">
        <Metric
          label="VERIFIED PLAYERS"
          value={snapshot?.players.verified ?? "—"}
          detail={`${snapshot?.players.verificationRate ?? 0}% of registrations`}
        />
        <Metric
          label="POOL NOW"
          value={snapshot?.queue.waitingPlayers ?? "—"}
          detail="players waiting"
        />
        <Metric
          label="ACTIVE SQUADS"
          value={snapshot?.queue.activeSquads ?? "—"}
          detail="currently playing"
        />
        <Metric
          label="NEEDS ATTENTION"
          value={snapshot ? attentionTotal : "—"}
          detail="across Operations"
          attention={attentionTotal > 0}
        />
      </section>

      <section className="control-section">
        <SectionHeading
          eyebrow="SEVEN-DAY SIGNAL"
          title="Movement across Vora"
          meta="Current window vs previous window"
        />
        <div className="control-trend-grid">
          <TrendCard
            label="REGISTRATIONS"
            comparison={snapshot?.trends.registrations}
            detail="new profiles"
          />
          <TrendCard
            label="VERIFICATIONS"
            comparison={snapshot?.trends.verificationApprovals}
            detail="approved players"
          />
          <TrendCard
            label="SQUADS FORMED"
            comparison={snapshot?.trends.squadsFormed}
            detail="formed squads"
          />
          <TrendCard
            label="VERIFIED RESULTS"
            comparison={snapshot?.trends.verifiedResults}
            detail="confirmed results"
          />
        </div>
      </section>

      <section className="control-two-column">
        <div className="control-section">
          <SectionHeading eyebrow="ACCESS" title="Competitive availability" />
          <div className="control-status-list">
            <div>
              <span
                className={`control-light ${
                  snapshot?.access.registrationOpen
                    ? "operational"
                    : "unavailable"
                }`}
              />
              <strong>Registration</strong>
              <b>{snapshot?.access.registrationOpen ? "Open" : "Paused"}</b>
            </div>
            <div>
              <span
                className={`control-light ${
                  snapshot?.access.matchmakingOpen
                    ? "operational"
                    : "unavailable"
                }`}
              />
              <strong>Matchmaking</strong>
              <b>{snapshot?.access.matchmakingOpen ? "Open" : "Paused"}</b>
            </div>
          </div>
        </div>
        <div className="control-section">
          <SectionHeading eyebrow="NEXT SESSION" title="Community schedule" />
          {snapshot?.queue.nextSession ? (
            <div className="control-session-card">
              <span>{snapshot.queue.nextSession.status}</span>
              <strong>{snapshot.queue.nextSession.title}</strong>
              <p>
                {formatDateTime(snapshot.queue.nextSession.startsAt)} to{" "}
                {formatDateTime(snapshot.queue.nextSession.endsAt)} UTC
              </p>
            </div>
          ) : (
            <p className="control-empty-inline">
              No upcoming community queue session is scheduled.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function Onboarding({
  snapshot,
}: {
  readonly snapshot: ControlSnapshot | null;
}) {
  const registered = snapshot?.players.registered ?? 0;
  const submitted =
    (snapshot?.players.verified ?? 0) +
    (snapshot?.players.pendingVerification ?? 0) +
    (snapshot?.players.rejectedVerification ?? 0);

  return (
    <>
      <section className="control-section">
        <SectionHeading
          eyebrow="PLAYER FUNNEL"
          title="From profile to queue eligibility"
          meta={`${snapshot?.players.verificationRate ?? 0}% verified`}
        />
        <div className="control-funnel">
          <FunnelStage
            label="REGISTERED"
            value={registered}
            total={registered}
            detail="player profiles"
          />
          <FunnelStage
            label="SUBMITTED"
            value={submitted}
            total={registered}
            detail="verification decisions or reviews"
          />
          <FunnelStage
            label="VERIFIED"
            value={snapshot?.players.verified ?? 0}
            total={registered}
            detail="queue eligible"
          />
        </div>
      </section>

      <section className="control-section">
        <SectionHeading
          eyebrow="ONBOARDING TREND"
          title="Last seven days"
          meta="Compared with the previous seven days"
        />
        <div className="control-trend-grid control-trend-grid-three">
          <TrendCard
            label="NEW PROFILES"
            comparison={snapshot?.trends.registrations}
            detail="registrations"
          />
          <TrendCard
            label="SUBMISSIONS"
            comparison={snapshot?.trends.verificationSubmissions}
            detail="verification submissions"
          />
          <TrendCard
            label="APPROVALS"
            comparison={snapshot?.trends.verificationApprovals}
            detail="verification approvals"
          />
        </div>
      </section>

      <section className="control-two-column">
        <div className="control-section">
          <SectionHeading eyebrow="REVIEW QUEUE" title="Operations workload" />
          <div className="control-compact-grid">
            <Metric
              label="PENDING"
              value={snapshot?.players.pendingVerification ?? "—"}
              detail="awaiting review"
              attention={(snapshot?.players.pendingVerification ?? 0) > 0}
            />
            <Metric
              label="OVER 48 HOURS"
              value={snapshot?.players.pendingOlderThan48Hours ?? "—"}
              detail="requires priority"
              attention={(snapshot?.players.pendingOlderThan48Hours ?? 0) > 0}
            />
            <Metric
              label="REJECTED"
              value={snapshot?.players.rejectedVerification ?? "—"}
              detail="may resubmit"
            />
            <Metric
              label="VERIFIED"
              value={snapshot?.players.verified ?? "—"}
              detail="all time"
            />
          </div>
        </div>
        <div className="control-section">
          <SectionHeading
            eyebrow="WEBSITE CONVERSION"
            title={`Last ${snapshot?.website?.periodDays ?? 30} days`}
          />
          <div className="control-compact-grid">
            <Metric
              label="PAGE VIEWS"
              value={snapshot?.website?.pageViews ?? "—"}
              detail="anonymous aggregate"
            />
            <Metric
              label="DISCORD CLICKS"
              value={snapshot?.website?.discordClicks ?? "—"}
              detail="join intent"
            />
            <Metric
              label="SITE TO DISCORD"
              value={
                snapshot?.website
                  ? `${snapshot.website.pageToDiscordRate}%`
                  : "—"
              }
              detail="conversion"
            />
            <Metric
              label="GUIDED PATH"
              value={
                snapshot?.website
                  ? `${snapshot.website.onboardingToDiscordRate}%`
                  : "—"
              }
              detail="onboarding conversion"
            />
          </div>
        </div>
      </section>
    </>
  );
}

function Matchmaking({
  snapshot,
}: {
  readonly snapshot: ControlSnapshot | null;
}) {
  return (
    <>
      <section className="control-section">
        <SectionHeading
          eyebrow="LIVE PIPELINE"
          title="Teammate formation"
          meta={
            snapshot?.access.matchmakingOpen
              ? "Matchmaking open"
              : "Matchmaking paused"
          }
        />
        <div className="control-metric-grid">
          <Metric
            label="WAITING"
            value={snapshot?.queue.waitingPlayers ?? "—"}
            detail="players in pool"
          />
          <Metric
            label="READY CHECKS"
            value={snapshot?.queue.readyChecks ?? "—"}
            detail="squads confirming"
          />
          <Metric
            label="ACTIVE"
            value={snapshot?.queue.activeSquads ?? "—"}
            detail="squads playing"
          />
          <Metric
            label="PENDING RESULTS"
            value={snapshot?.queue.pendingResults ?? "—"}
            detail="awaiting outcome"
            attention={(snapshot?.queue.pendingResults ?? 0) > 0}
          />
        </div>
      </section>

      <section className="control-section">
        <SectionHeading
          eyebrow="FORMATION TREND"
          title="Seven-day throughput"
          meta="Current window vs previous window"
        />
        <div className="control-trend-grid control-trend-grid-two">
          <TrendCard
            label="SQUADS FORMED"
            comparison={snapshot?.trends.squadsFormed}
            detail="new squad sessions"
          />
          <TrendCard
            label="RESULTS VERIFIED"
            comparison={snapshot?.trends.verifiedResults}
            detail="competitive outcomes"
          />
        </div>
      </section>

      <section className="control-two-column">
        <div className="control-section">
          <SectionHeading eyebrow="RESULT INTEGRITY" title="Open lifecycle" />
          <div className="control-compact-grid">
            <Metric
              label="PENDING"
              value={snapshot?.queue.pendingResults ?? "—"}
              detail="result reports"
            />
            <Metric
              label="DISPUTED"
              value={snapshot?.queue.disputedResults ?? "—"}
              detail="requires review"
              attention={(snapshot?.queue.disputedResults ?? 0) > 0}
            />
          </div>
        </div>
        <div className="control-section">
          <SectionHeading eyebrow="NEXT SESSION" title="Queue activation" />
          {snapshot?.queue.nextSession ? (
            <div className="control-session-card">
              <span>{snapshot.queue.nextSession.status}</span>
              <strong>{snapshot.queue.nextSession.title}</strong>
              <p>
                Starts {formatDateTime(snapshot.queue.nextSession.startsAt)} UTC
              </p>
              <p>
                Ends {formatDateTime(snapshot.queue.nextSession.endsAt)} UTC
              </p>
            </div>
          ) : (
            <p className="control-empty-inline">
              No upcoming community queue session is scheduled.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function Integrity({
  snapshot,
}: {
  readonly snapshot: ControlSnapshot | null;
}) {
  return (
    <>
      <section className="control-section">
        <SectionHeading
          eyebrow="OPERATIONS INBOX"
          title="Competitive and community integrity"
          meta="Current unresolved workload"
        />
        <div className="control-metric-grid">
          <Metric
            label="REPORTS"
            value={snapshot?.moderation.openReports ?? "—"}
            detail="open community reports"
            attention={(snapshot?.moderation.openReports ?? 0) > 0}
          />
          <Metric
            label="CASES"
            value={snapshot?.moderation.pendingCases ?? "—"}
            detail="pending actions"
            attention={(snapshot?.moderation.pendingCases ?? 0) > 0}
          />
          <Metric
            label="TICKETS"
            value={snapshot?.moderation.openTickets ?? "—"}
            detail="open support requests"
            attention={(snapshot?.moderation.openTickets ?? 0) > 0}
          />
          <Metric
            label="DISPUTES"
            value={snapshot?.queue.disputedResults ?? "—"}
            detail="match results"
            attention={(snapshot?.queue.disputedResults ?? 0) > 0}
          />
        </div>
      </section>

      <section className="control-section">
        <SectionHeading
          eyebrow="INTAKE TREND"
          title="Seven-day demand"
          meta="Current window vs previous window"
        />
        <div className="control-trend-grid control-trend-grid-two">
          <TrendCard
            label="REPORTS OPENED"
            comparison={snapshot?.trends.reportsOpened}
            detail="community reports"
          />
          <TrendCard
            label="TICKETS OPENED"
            comparison={snapshot?.trends.ticketsOpened}
            detail="support tickets"
          />
        </div>
      </section>

      <section className="control-section control-guidance">
        <SectionHeading
          eyebrow="READ-ONLY BOUNDARY"
          title="Investigate in Discord"
        />
        <p>
          Vora Control intentionally exposes aggregate workload only. Evidence,
          member identities, case decisions and moderation actions remain in the
          protected Discord workflows where the existing audit trail applies.
        </p>
      </section>
    </>
  );
}

function System({ snapshot }: { readonly snapshot: ControlSnapshot | null }) {
  return (
    <>
      <section className="control-section">
        <SectionHeading
          eyebrow="SYSTEM HEALTH"
          title="Core services"
          meta="Heartbeat-backed status"
        />
        <div className="control-service-grid">
          {snapshot ? (
            <>
              <ServiceCard name="Vora Core" service={snapshot.services.core} />
              <ServiceCard
                name="Vora Community"
                service={snapshot.services.community}
              />
            </>
          ) : (
            <p className="control-empty">No service heartbeat is available.</p>
          )}
        </div>
      </section>

      <section className="control-two-column">
        <div className="control-section">
          <SectionHeading eyebrow="SERVICE ACCESS" title="Operational gates" />
          <div className="control-status-list">
            <div>
              <span
                className={`control-light ${
                  snapshot?.access.registrationOpen
                    ? "operational"
                    : "unavailable"
                }`}
              />
              <strong>Registration</strong>
              <b>{snapshot?.access.registrationOpen ? "Open" : "Paused"}</b>
            </div>
            <div>
              <span
                className={`control-light ${
                  snapshot?.access.matchmakingOpen
                    ? "operational"
                    : "unavailable"
                }`}
              />
              <strong>Matchmaking</strong>
              <b>{snapshot?.access.matchmakingOpen ? "Open" : "Paused"}</b>
            </div>
          </div>
          {snapshot?.access.maintenanceReason ? (
            <p className="control-maintenance">
              {snapshot.access.maintenanceReason}
            </p>
          ) : null}
        </div>
        <div className="control-section">
          <SectionHeading eyebrow="DATA PIPELINE" title="Snapshot contract" />
          <dl className="control-definition-list">
            <div>
              <dt>Schema</dt>
              <dd>Version {snapshot?.schemaVersion ?? "—"}</dd>
            </div>
            <div>
              <dt>Published</dt>
              <dd>
                {snapshot
                  ? `${formatDateTime(snapshot.generatedAt)} UTC`
                  : "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>Privacy</dt>
              <dd>Aggregate data only</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>Authenticated operations</dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}

function ViewContent({
  view,
  snapshot,
}: {
  readonly view: ControlView;
  readonly snapshot: ControlSnapshot | null;
}) {
  switch (view) {
    case "onboarding":
      return <Onboarding snapshot={snapshot} />;
    case "matchmaking":
      return <Matchmaking snapshot={snapshot} />;
    case "integrity":
      return <Integrity snapshot={snapshot} />;
    case "system":
      return <System snapshot={snapshot} />;
    case "actions":
      return <ControlActions />;
    default:
      return <Overview snapshot={snapshot} />;
  }
}

export default async function ControlPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    readonly auth?: string;
    readonly view?: string;
  }>;
}) {
  const session = await getControlSession();
  const { auth, view: requestedView } = await searchParams;

  if (!session) {
    return (
      <ControlLogin
        configured={getControlAuthConfig() !== null}
        status={auth}
      />
    );
  }

  const view = resolveView(requestedView);
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
              A focused operations center for onboarding, teammate formation,
              competitive integrity and service health.
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

        <ControlNavigation current={view} />

        {unavailable ? (
          <section className="control-unavailable" role="alert">
            <p className="eyebrow">DATA PIPELINE</p>
            <h2>Control data is not current.</h2>
            <p>
              Vora Community will publish the next private operational snapshot
              during its next status synchronization.
            </p>
          </section>
        ) : null}

        <div className="control-view" id={`control-${view}`}>
          <ViewContent view={view} snapshot={snapshot} />
        </div>

        <footer className="control-footer">
          Authenticated operations center · Sensitive actions require an
          explicit confirmation and are written to the audit trail.
        </footer>
      </section>
    </main>
  );
}
