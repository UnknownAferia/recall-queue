"use client";

import { useEffect, useMemo, useState } from "react";

const roles = ["EXP Lane", "Jungle", "Mid Lane", "Gold Lane", "Roam"] as const;

interface DraftSlot {
  player: string;
  hero: string;
  backup: string;
}

const emptySlots = roles.map(() => ({ player: "", hero: "", backup: "" }));

function encodeDraft(slots: readonly DraftSlot[], notes: string) {
  return btoa(
    unescape(encodeURIComponent(JSON.stringify({ version: 1, slots, notes }))),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeDraft(value: string): { slots: DraftSlot[]; notes: string } | null {
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const parsed = JSON.parse(
      decodeURIComponent(escape(atob(normalized))),
    ) as { version?: number; slots?: DraftSlot[]; notes?: string };
    if (parsed.version !== 1 || parsed.slots?.length !== roles.length) {
      return null;
    }
    return { slots: parsed.slots, notes: parsed.notes ?? "" };
  } catch {
    return null;
  }
}

export function DraftPlanner() {
  const [slots, setSlots] = useState<DraftSlot[]>(emptySlots);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const complete = useMemo(
    () => slots.filter((slot) => slot.player.trim() && slot.hero.trim()).length,
    [slots],
  );

  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get("plan");
    const decoded = shared ? decodeDraft(shared) : null;
    if (decoded) {
      setSlots(decoded.slots);
      setNotes(decoded.notes);
    }
  }, []);

  function update(index: number, field: keyof DraftSlot, value: string) {
    setSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value.slice(0, 48) } : slot,
      ),
    );
  }

  async function share() {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("plan", encodeDraft(slots, notes));
    await navigator.clipboard.writeText(url.toString());
    window.history.replaceState(null, "", url);
    setMessage("Share link copied. Anyone with the link can open this plan.");
  }

  return (
    <div className="draft-planner">
      <div className="draft-toolbar">
        <p>
          <strong>{complete}/5</strong> role assignments ready
        </p>
        <div>
          <button className="button button-outline" type="button" onClick={() => {
            setSlots(emptySlots);
            setNotes("");
            setMessage("Draft cleared.");
            window.history.replaceState(null, "", "/draft");
          }}>
            Clear
          </button>
          <button className="button button-primary" type="button" onClick={share}>
            Copy share link
          </button>
        </div>
      </div>

      <div className="draft-grid">
        {roles.map((role, index) => (
          <article key={role}>
            <span>{(index + 1).toString().padStart(2, "0")}</span>
            <h2>{role}</h2>
            <label>
              Player
              <input
                value={slots[index]?.player ?? ""}
                onChange={(event) => update(index, "player", event.target.value)}
                placeholder="Discord or in-game name"
              />
            </label>
            <label>
              First-choice hero
              <input
                value={slots[index]?.hero ?? ""}
                onChange={(event) => update(index, "hero", event.target.value)}
                placeholder="Hero"
              />
            </label>
            <label>
              Backup hero
              <input
                value={slots[index]?.backup ?? ""}
                onChange={(event) => update(index, "backup", event.target.value)}
                placeholder="Optional"
              />
            </label>
          </article>
        ))}
      </div>

      <label className="draft-notes">
        Team plan
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value.slice(0, 500))}
          placeholder="Draft priorities, bans, rotations or objective notes…"
          rows={5}
        />
      </label>
      <p className="draft-message" role="status">{message}</p>
      <p className="draft-privacy">
        Plans live only in this browser and inside the share link. Vora does not
        upload or store them.
      </p>
    </div>
  );
}
