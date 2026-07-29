"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { ControlOperationsSnapshot } from "../lib/controlOperations";

async function request(method: "GET" | "POST", body?: unknown) {
  const response = await fetch("/api/control/operations", {
    method,
    headers: method === "POST" ? { "content-type": "application/json" } : {},
    body: method === "POST" ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const result = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(result.error ?? "Operation failed."));
  return result;
}

export function ControlActions() {
  const [data, setData] = useState<ControlOperationsSnapshot | null>(null);
  const [message, setMessage] = useState("Loading live operations…");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      setData((await request("GET")) as unknown as ControlOperationsSnapshot);
      setMessage("Live operations synchronized.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load.");
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function act(input: Record<string, unknown>, confirmation: string) {
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    setMessage("Applying operation…");
    try {
      await request("POST", input);
      await refresh();
      setMessage("Operation applied and recorded in the audit trail.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function schedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = new FormData(form);
    await act({
      action: "session.schedule",
      title: input.get("title"),
      startsInMinutes: Number(input.get("starts")),
      durationMinutes: Number(input.get("duration")),
    }, "Schedule this public queue session?");
    form.reset();
  }

  return (
    <div className="control-actions">
      <div className="control-actions-status" role="status">
        <span className={`control-light ${busy ? "unavailable" : "operational"}`} />
        {message}
        <button type="button" onClick={() => void refresh()} disabled={busy}>Refresh</button>
      </div>

      <section className="control-section">
        <div className="control-section-heading"><div><p className="eyebrow">SERVICE GATES</p><h2>Maintenance controls</h2></div><span>Confirmed and audited</span></div>
        <div className="control-action-grid">
          {(["registration", "matchmaking"] as const).map((scope) => {
            const open = scope === "registration" ? data?.state.registrationOpen : data?.state.matchmakingOpen;
            return <article key={scope}>
              <h3>{scope}</h3><p>{open ? "Open" : "Paused"} · {data?.state.reason ?? "No active reason"}</p>
              <button disabled={busy || !data} className={open ? "control-danger-button" : "control-safe-button"} onClick={() => {
                const reason = window.prompt(`Reason for ${open ? "pausing" : "opening"} ${scope}:`, open ? "Planned operational maintenance" : "Service restored after maintenance");
                if (reason) void act({ action: "maintenance.set", scope, open: !open, reason }, `${open ? "Pause" : "Open"} ${scope}?`);
              }}>{open ? "Pause" : "Open"} {scope}</button>
            </article>;
          })}
        </div>
      </section>

      <section className="control-section">
        <div className="control-section-heading"><div><p className="eyebrow">QUEUE ACTIVATION</p><h2>Community sessions</h2></div></div>
        <form className="control-session-form" onSubmit={schedule}>
          <input name="title" placeholder="Session title" minLength={3} maxLength={80} required />
          <input name="starts" type="number" min={5} max={10080} placeholder="Starts in minutes" required />
          <input name="duration" type="number" min={30} max={480} defaultValue={120} required />
          <button disabled={busy} className="control-safe-button">Schedule</button>
        </form>
        <div className="control-action-list">
          {data?.sessions.map((session) => <article key={session.id}>
            <div><strong>{session.title}</strong><p>{new Date(session.startsAt).toLocaleString()} · {session.status}</p></div>
            <button className="control-danger-button" disabled={busy || session.status !== "scheduled"} onClick={() => void act({ action: "session.cancel", sessionId: session.id }, `Cancel “${session.title}”?`)}>Cancel</button>
          </article>)}
          {data?.sessions.length === 0 ? <p>No upcoming sessions.</p> : null}
        </div>
      </section>

      <section className="control-section">
        <div className="control-section-heading"><div><p className="eyebrow">PLAYER ONBOARDING</p><h2>Pending verification</h2></div><span>{data?.verificationRequests.length ?? 0} requests</span></div>
        <div className="control-action-list">
          {data?.verificationRequests.map((item) => <article key={item.id}>
            <div><strong>{item.ign}</strong><p>MLBB {item.playerId} ({item.serverId}) · <a href={item.evidenceUrl} target="_blank" rel="noreferrer">Open evidence</a></p></div>
            <div>
              <button className="control-safe-button" disabled={busy} onClick={() => void act({ action: "verification.review", requestId: item.id, decision: "approve" }, `Approve ${item.ign}?`)}>Approve</button>
              <button className="control-danger-button" disabled={busy} onClick={() => {
                const reason = window.prompt(`Rejection reason for ${item.ign}:`);
                if (reason) void act({ action: "verification.review", requestId: item.id, decision: "reject", reason }, `Reject ${item.ign}?`);
              }}>Reject</button>
            </div>
          </article>)}
          {data?.verificationRequests.length === 0 ? <p>No pending verifications.</p> : null}
        </div>
      </section>

      <section className="control-section">
        <div className="control-section-heading"><div><p className="eyebrow">INTEGRITY</p><h2>Open reports</h2></div><span>{data?.reports.length ?? 0} reports</span></div>
        <div className="control-action-list">
          {data?.reports.map((report) => <article key={report.number}>
            <div><strong>Report #{report.number} · {report.type}</strong><p>{report.description}</p></div>
            <button className="control-danger-button" disabled={busy} onClick={() => {
              const reason = window.prompt(`Dismissal note for report #${report.number}:`);
              if (reason) void act({ action: "report.dismiss", reportNumber: report.number, reason }, `Dismiss report #${report.number}?`);
            }}>Dismiss</button>
          </article>)}
          {data?.reports.length === 0 ? <p>No open reports.</p> : null}
        </div>
      </section>
    </div>
  );
}
