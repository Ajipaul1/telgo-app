"use client";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { Button, ErrorNote, Pill, PicThumb, Sheet, TextArea } from "@/components/ui";
import { call, ApiError } from "@/lib/client/api";
import { fmtWhen } from "@/lib/shared/format";
import { changeWords, type Change } from "./common";

// one request in an item's history, with the admin's Approve / Not approved when it is waiting
export function ChangeRow({ c, unit, onDecided }: { c: Change; unit: string | null; onDecided?: () => void }) {
  const { me, toast, refreshCounts } = useApp();
  const [sheet, setSheet] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<ApiError | null>(null);
  const decide = async (decision: "approve" | "reject") => {
    setErr(null);
    try {
      await call(`/api/inventory/changes/${c.id}`, { body: { decision, note } });
      setSheet(null); refreshCounts(); toast(decision === "approve" ? "Approved. The item is updated." : "Not approved. They are told why.");
      onDecided?.();
    } catch (e) { setErr(e as ApiError); }
  };
  return (
    <div className={"card" + (c.status === "pending" ? " line-warn" : c.status === "approved" ? " line-ok" : " line-bad")} data-testid="inventory-change">
      <div className="row between"><b>{changeWords(c, unit)}</b><Pill tone={c.status === "pending" ? "warn" : c.status === "approved" ? "ok" : "bad"}>{c.status === "pending" ? "Waiting for the admin" : c.status === "approved" ? "Approved" : "Not approved"}</Pill></div>
      <span className="small muted">Asked by {c.requestedBy} · {fmtWhen(c.requestedAt)}</span>
      {c.note && <p className="small">{c.note}</p>}
      {c.photoFileId && <div className="thumbs"><PicThumb pic={{ fileId: c.photoFileId, mime: "image/jpeg" }} label="Photo" /></div>}
      {c.status !== "pending" && <span className="small">{c.status === "approved" ? "Approved" : "Not approved"} by {c.decidedBy ?? "the admin"} · {fmtWhen(c.decidedAt)}{c.decisionNote ? ` · “${c.decisionNote}”` : ""}</span>}
      {c.status === "pending" && me?.role === "admin" && (
        <div className="btn-row">
          <Button kind="ok" small onClick={() => { setErr(null); setNote(""); setSheet("approve"); }} testId="inv-approve">Approve</Button>
          <Button kind="danger" small onClick={() => { setErr(null); setNote(""); setSheet("reject"); }} testId="inv-reject">Not approved</Button>
        </div>
      )}
      <Sheet open={!!sheet} onClose={() => setSheet(null)} label="Decide">
        <h2>{sheet === "approve" ? "Approve this change?" : "Not approve it?"}</h2>
        <p className="muted">{changeWords(c, unit)} · asked by {c.requestedBy}. {sheet === "approve" ? "The item is updated now and they are told." : "The item stays as it is and they are told why."}</p>
        <TextArea label={sheet === "approve" ? "Note (optional)" : "Why not"} value={note} onChange={setNote} rows={2} testId="inv-decide-note" />
        {err && <ErrorNote error={err} />}
        <div className="btn-row">
          <Button kind="ghost" onClick={() => setSheet(null)}>Back</Button>
          <Button kind={sheet === "approve" ? "ok" : "danger"} onClick={() => decide(sheet!)} busyText="Saving…" disabled={sheet === "reject" && note.trim().length < 2} testId="inv-decide-confirm">{sheet === "approve" ? "Approve" : "Not approved"}</Button>
        </div>
      </Sheet>
    </div>
  );
}
