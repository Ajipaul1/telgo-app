"use client";
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Button, ErrorNote, Loaded, NumberInput, PhotoPicker, Saved, Select, TextArea, TextInput, Empty } from "@/components/ui";
import { useDraft, useLoad } from "@/lib/client/hooks";
import { call, newRef, ApiError } from "@/lib/client/api";
import { getPosition } from "@/lib/client/device";
import { addDays, istToday } from "@/lib/shared/format";
import type { Pic } from "@/lib/shared/report";
import type { ProjectView } from "@/lib/shared/project";
import { COMMON_ITEMS, UNITS, type Item } from "../_parts/common";

type Form = { projectId: string; material: string; description: string; quantity: number | null; unit: string; location: string; at: [number, number] | null; photo: Pic | null; day: string; ref: string };
const fresh = (projectId = ""): Form => ({ projectId, material: "", description: "", quantity: null, unit: "m", location: "", at: null, photo: null, day: istToday(), ref: newRef() });

// Add to inventory: what arrived at a site, how much, where it is kept, with a photo
export default function AddInventory() {
  const { me, toast } = useApp();
  const projects = useLoad<{ projects: ProjectView[] }>("/api/projects");
  const [f, setF, clear] = useDraft<Form>(`telgo_inventory_draft_${me?.id}`, () => fresh());
  const [err, setErr] = useState<ApiError | null>(null);
  const [gpsErr, setGpsErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ item: Item; at: string } | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setErr(null);
    try {
      const r = await call<{ item: Item; serverTime: string }>("/api/inventory", { body: {
        ref: f.ref, projectId: f.projectId, material: f.material, description: f.description, quantity: f.quantity, unit: f.unit,
        location: f.location, lat: f.at?.[0] ?? null, lng: f.at?.[1] ?? null, photoFileId: f.photo?.fileId ?? null, unloadedOn: f.day,
      } });
      clear();
      setDone({ item: r.item, at: r.serverTime });
      setF(fresh(f.projectId));
      toast("Added to inventory. The admin is told.");
    } catch (e) { setErr(e as ApiError); }
  };

  return (
    <Screen title="Add to inventory" roles={["admin", "supervisor", "engineer"]} testId="inventory-add">
      {done && (
        <div className="stack">
          <Saved at={done.at} what={`${done.item.material} added`} />
          <Button kind="ghost" block href={`/app/inventory/item/${done.item.id}`}>Open it</Button>
        </div>
      )}
      <Loaded load={projects} isEmpty={(d) => !d.projects.length} empty={<Empty title="No projects yet" />}>
        {(d) => (
          <div className="card pad-lg" data-vm-editing="1">
            <Select label="Site" value={f.projectId} onChange={(v) => set("projectId", v)} placeholder="Choose the site" testId="inv-project"
              options={d.projects.map((p) => ({ value: p.id, label: p.name + (p.district ? ` · ${p.district}` : "") }))} />
            <TextInput label="Item" value={f.material} onChange={(v) => set("material", v)} placeholder="e.g. Cable 11 kV" maxLength={120} testId="inv-material" />
            <div className="choice">{COMMON_ITEMS.slice(0, 8).map((c) => <button key={c} type="button" aria-pressed={f.material === c} onClick={() => set("material", c)}>{c}</button>)}</div>
            <TextArea label="Description" value={f.description} onChange={(v) => set("description", v)} rows={2} placeholder="Size, make, drum number…" testId="inv-description" />
            <div className="grid2">
              <NumberInput label="Quantity" value={f.quantity} onChange={(v) => set("quantity", v)} testId="inv-quantity" />
              <Select label="Unit" value={f.unit} onChange={(v) => set("unit", v)} options={UNITS.map((u) => ({ value: u, label: u }))} testId="inv-unit" />
            </div>
            <TextArea label="Where it is kept" value={f.location} onChange={(v) => set("location", v)} rows={2} placeholder="e.g. near the Kolenchery junction, behind the KSEB office" testId="inv-location" />
            <div className="row wrap">
              <Button kind="soft" small onClick={async () => { setGpsErr(null); try { const p = await getPosition(); set("at", [p.lat, p.lng]); } catch (e) { setGpsErr((e as Error).message); } }}>{f.at ? "Location added (tap to update)" : "Add my location"}</Button>
              {f.at && <button type="button" className="link-btn" onClick={() => set("at", null)}>Remove location</button>}
            </div>
            {gpsErr && <span className="small" style={{ color: "var(--bad)" }}>{gpsErr}</span>}
            <PhotoPicker label="Photo" kind="material" max={1} pics={f.photo ? [f.photo] : []} onChange={(p) => set("photo", p[0] ?? null)} testId="inv-photo" />
            <div className="field"><label htmlFor="inv-day">Arrived on</label><input id="inv-day" className="input" type="date" value={f.day} min={addDays(istToday(), -60)} max={istToday()} onChange={(e) => set("day", e.target.value)} /></div>
            {err && <ErrorNote error={err} />}
            <Button big block onClick={save} busyText="Saving…" testId="inv-save" disabled={!f.projectId || !f.material.trim() || !f.location.trim()}>Save to inventory</Button>
          </div>
        )}
      </Loaded>
    </Screen>
  );
}
