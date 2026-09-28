"use client";
// One notification: tap to open it, "×" (or a swipe to the left) to clear it.
import { useRef, useState, type TouchEvent } from "react";
import { Pill } from "@/components/ui";
import { fmtWhen } from "@/lib/shared/format";

export type Note = { id: string; title: string; body: string | null; topic: string; link: string | null; read: boolean; at: string };

// the colour edge by what it is about
const LINE: Record<string, string> = { approved: "line-ok", fix: "line-bad", attendance: "line-warn", access: "line-warn" };
export const lineOf = (topic: string) => LINE[topic] ?? "line-info";

const TOPIC_WORD: Record<string, string> = {
  report: "Daily report", approved: "Approved", fix: "Asked to fix", message: "Message", attendance: "Attendance",
  access: "Access request", inventory: "Inventory", material: "Site storage", chat: "Chat", test: "Test",
};
const topicWord = (t: string) => TOPIC_WORD[t] ?? "Notice";

const SWIPE_CLEAR = 110; // px to the left that clears it

export function NoteRow({ n, onOpen, onClear }: { n: Note; onOpen: () => Promise<unknown>; onClear: () => Promise<boolean> }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const start = useRef<{ x: number; y: number; on: boolean | null } | null>(null);
  const last = useRef(0);
  const swiped = useRef(false);

  const clear = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await onClear().catch(() => false);
    if (!ok) { setDx(0); setBusy(false); } // it stays; the screen says why
  };
  const open = async () => {
    if (swiped.current) { swiped.current = false; return; }
    if (busy) return;
    setBusy(true);
    try { await onOpen(); } finally { setBusy(false); }
  };

  const touchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, on: null };
    swiped.current = false;
  };
  const touchMove = (e: TouchEvent) => {
    const s = start.current;
    if (!s || busy) return;
    const t = e.touches[0];
    const mx = t.clientX - s.x, my = t.clientY - s.y;
    if (s.on === null) {
      if (Math.abs(mx) < 12 && Math.abs(my) < 12) return;
      s.on = Math.abs(mx) > Math.abs(my) * 1.3 && mx < 0; // only a sideways swipe to the left; scrolling stays scrolling
      if (s.on) setDragging(true);
    }
    if (s.on) { last.current = Math.min(0, mx); setDx(last.current); }
  };
  const touchEnd = () => {
    const s = start.current;
    start.current = null;
    setDragging(false);
    if (!s?.on) return;
    swiped.current = true;
    setTimeout(() => (swiped.current = false), 400);
    if (last.current <= -SWIPE_CLEAR) { setDx(-480); clear(); } else setDx(0);
    last.current = 0;
  };

  return (
    <div style={{ position: "relative" }} data-testid="notification">
      {dx < 0 && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "var(--r)", background: "var(--bad-bg)", color: "var(--bad)", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 22px" }}>
          {dx <= -SWIPE_CLEAR ? "Let go to clear" : "Clear"}
        </div>
      )}
      <div className={"card " + lineOf(n.topic)}
        style={{ flexDirection: "row", alignItems: "flex-start", gap: 0, padding: 0, transform: dx ? `translateX(${dx}px)` : undefined, transition: dragging ? "none" : "transform .2s ease-out", touchAction: "pan-y", opacity: busy && dx < -SWIPE_CLEAR ? 0.6 : 1 }}
        onTouchStart={touchStart} onTouchMove={touchMove} onTouchEnd={touchEnd} onTouchCancel={touchEnd}>
        <button type="button" onClick={open} data-testid={`notification-${n.id}`} aria-label={`${n.read ? "" : "New: "}${n.title}`}
          style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4, padding: "14px 4px 14px 18px", border: 0, background: "none", color: "inherit", textAlign: "left", cursor: "pointer", font: "inherit" }}>
          <span className="tiny muted">{topicWord(n.topic)} · {fmtWhen(n.at)}</span>
          <span className="row" style={{ alignItems: "flex-start", gap: 8 }}>
            <span className="grow" style={{ fontWeight: n.read ? 600 : 800, color: n.read ? "var(--ink)" : "var(--brand)", overflowWrap: "anywhere" }}>{n.title}</span>
            {!n.read && <Pill tone="info">New</Pill>}
          </span>
          {n.body && <span className="small muted" style={{ overflowWrap: "anywhere" }}>{n.body}</span>}
          {n.link && n.link.startsWith("/") && <span className="tiny" style={{ color: "var(--info)", fontWeight: 700 }}>Tap to open</span>}
        </button>
        <button type="button" aria-label="Clear" onClick={clear} disabled={busy} data-testid={`notification-clear-${n.id}`}
          style={{ flex: "none", width: 48, height: 52, marginTop: 4, border: 0, background: "none", color: "var(--faint)", fontSize: 26, lineHeight: 1, cursor: "pointer", borderRadius: 12 }}>
          ×
        </button>
      </div>
    </div>
  );
}
