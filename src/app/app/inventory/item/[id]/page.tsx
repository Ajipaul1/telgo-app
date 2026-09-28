"use client";
import { use, useState } from "react";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Button, ErrorNote, Loaded, NumberInput, PhotoPicker, Pill, PicThumb, Sheet, TextArea, Empty } from "@/components/ui";
import { MapView, OpenInGoogleMaps } from "@/components/Map";
import { useLoad } from "@/lib/client/hooks";
import { call, newRef, ApiError } from "@/lib/client/api";
import { getPosition } from "@/lib/client/device";
import { fmtDay, fmtWhen } from "@/lib/shared/format";
import type { Pic } from "@/lib/shared/report";
import { qty, type Change, type Item } from "../../_parts/common";
import { ChangeRow } from "../../_parts/History";

type Data = { item: Item; history: Change[]; canRequest: boolean };

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const load = useLoad<Data>(`/api/inventory/${id}`, { every: 30 });
  return (
    <Screen title="Inventory item" roles={["admin", "supervisor", "engineer", "finance"]} testId="inventory-item-page">
      <Loaded load={load}>
        {(d) => (
          <>
            <div className="card">
              <div className="row between"><h1 className="ellipsis">{d.item.material}</h1>{d.item.status === "closed" ? <Pill>Closed</Pill> : <Pill tone="ok">In stock</Pill>}</div>
              {d.item.photoFileId && <div className="thumbs"><PicThumb pic={{ fileId: d.item.photoFileId, mime: "image/jpeg" }} label={d.item.material} /></div>}
              <dl className="kv">
                <dt>Site</dt><dd>{d.item.projectName ?? d.item.projectId}</dd>
                <dt>Left</dt><dd data-testid="inv-left">{qty(d.item.quantityLeft, d.item.unit)}</dd>
                <dt>Arrived</dt><dd>{qty(d.item.quantity, d.item.unit)} on {fmtDay(d.item.day)}</dd>
                <dt>Kept at</dt><dd data-testid="inv-location-now">{d.item.location ?? "—"}</dd>
                <dt>Added by</dt><dd>{d.item.addedBy} · {fmtWhen(d.item.addedAt)}</dd>
                {d.item.closedAt && <><dt>Closed</dt><dd>{fmtWhen(d.item.closedAt)}</dd></>}
              </dl>
              {d.item.description && <p className="small">{d.item.description}</p>}
            </div>
            {d.item.lat !== null && d.item.lng !== null && <MapView size="short" pins={[{ at: [d.item.lat, d.item.lng], text: "", kind: "brand", title: d.item.location ?? d.item.material }]}><OpenInGoogleMaps at={[d.item.lat, d.item.lng]} /></MapView>}
            {d.canRequest ? <Requests item={d.item} onSent={load.reload} /> : d.history.some((c) => c.status === "pending") ? (
              <div className="notice warn">A change is waiting for the admin. The item changes only when it is approved.</div>
            ) : null}
            <div className="section-title">History</div>
            {d.history.length ? d.history.map((c) => <ChangeRow key={c.id} c={c} unit={d.item.unit} onDecided={load.reload} />) : <Empty title="No changes yet">Added {fmtWhen(d.item.addedAt)} by {d.item.addedBy}.</Empty>}
          </>
        )}
      </Loaded>
    </Screen>
  );
}

// Moved / Used some / Fully used: a request the admin approves; nothing changes until then
function Requests({ item, onSent }: { item: Item; onSent: () => void }) {
  const { me, toast } = useApp();
  const [kind, setKind] = useState<"moved" | "used" | "closed" | null>(null);
  const [used, setUsed] = useState<number | null>(null);
  const [where, setWhere] = useState("");
  const [at, setAt] = useState<[number, number] | null>(null);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<Pic | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [ref, setRef] = useState(newRef());
  if (me?.role === "finance") return null;
  const open = (k: "moved" | "used" | "closed") => { setKind(k); setUsed(null); setWhere(""); setAt(null); setNote(""); setPhoto(null); setErr(null); setRef(newRef()); };
  const send = async () => {
    setErr(null);
    try {
      await call(`/api/inventory/${item.id}`, { body: { ref, kind, quantityUsed: used, newLocation: where, lat: at?.[0] ?? null, lng: at?.[1] ?? null, note, photoFileId: photo?.fileId ?? null } });
      setKind(null); toast("Sent to the admin for approval."); onSent();
    } catch (e) { setErr(e as ApiError); }
  };
  return (
    <div className="card" data-testid="inventory-requests">
      <h2>Something changed?</h2>
      <p className="small muted">Tell the admin. The item changes only when the admin approves.</p>
      <div className="stack tight">
        <Button kind="soft" block onClick={() => open("moved")} testId="inv-moved">It was moved</Button>
        <Button kind="soft" block onClick={() => open("used")} testId="inv-used">Some of it was used</Button>
        <Button kind="soft" block onClick={() => open("closed")} testId="inv-closed">It is fully used: close it</Button>
      </div>
      <Sheet open={!!kind} onClose={() => setKind(null)} label="Change">
        <h2>{kind === "moved" ? "Moved to where?" : kind === "used" ? "How much was used?" : "Fully used"}</h2>
        {kind === "used" && <NumberInput label={`Used (${item.unit ?? "quantity"})`} unit={item.unit ?? ""} value={used} onChange={setUsed} hint={item.quantityLeft !== null ? `${qty(item.quantityLeft, item.unit)} left now.` : undefined} testId="inv-used-qty" />}
        {kind === "moved" && (
          <>
            <TextArea label="New place" value={where} onChange={setWhere} rows={2} testId="inv-new-place" />
            <Button kind="soft" small onClick={async () => { try { const p = await getPosition(); setAt([p.lat, p.lng]); } catch (e) { setErr(e as ApiError); } }}>{at ? "Location added" : "Add my location"}</Button>
          </>
        )}
        <TextArea label={kind === "closed" ? "How it was used up" : "Note"} value={note} onChange={setNote} rows={2} testId="inv-change-note" />
        <PhotoPicker label="Photo" kind="material" max={1} pics={photo ? [photo] : []} onChange={(p) => setPhoto(p[0] ?? null)} />
        {err && <ErrorNote error={err} />}
        <div className="btn-row">
          <Button kind="ghost" onClick={() => setKind(null)}>Cancel</Button>
          <Button onClick={send} busyText="Sending…" testId="inv-change-send" disabled={(kind === "used" && !used) || (kind === "moved" && !where.trim() && !at) || (kind === "closed" && !note.trim() && !photo)}>Send to the admin</Button>
        </div>
      </Sheet>
    </div>
  );
}
