"use client";
// The project's work plan on the map (owner's ask, 28 Sep 2026): the whole route (the total work), then
// work parts by type (Open trench, HDD, Cable laying, or a new type the admin writes), each drawn on the
// map along the roads (HDD straight by default), each with its length, Edit and Delete. Totals below.
import { useState } from "react";
import { Button, Empty, Select, Sheet, TextInput } from "@/components/ui";
import { LineEditor } from "@/components/LineEditor";
import type { MapLine } from "@/components/Map";
import { metres } from "@/lib/shared/format";
import { emptyLine, followsByDefault, planTotals, typeColor, type PlanLine, type PlanPart, type ProjectPlan } from "@/lib/shared/plan";

const NEW_TYPE = "__new__";

export function PlanEditor({ plan, onChange }: { plan: ProjectPlan; onChange: (p: ProjectPlan) => void }) {
  const [editing, setEditing] = useState<"route" | string>("route");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PlanPart | null>(null);
  const route = plan.route ?? emptyLine(true);
  const part = editing === "route" ? null : plan.parts.find((p) => p.id === editing) ?? null;
  const t = planTotals(plan);

  const setRoute = (l: PlanLine) => onChange({ ...plan, route: l });
  const setPart = (id: string, l: Partial<PlanPart>) => onChange({ ...plan, parts: plan.parts.map((p) => (p.id === id ? { ...p, ...l } : p)) });
  // what is shown faded behind the line being drawn: the route and the other parts, in their colours
  const behind: MapLine[] = [
    ...(editing !== "route" && route.path.length > 1 ? [{ points: route.path, color: "#b8b0ff", weight: 5, title: "Whole route" }] : []),
    ...plan.parts.filter((p) => p.id !== editing && p.path.length > 1).map((p) => ({ points: p.path, color: typeColor(p.type, plan.types), weight: 5, dashed: true, title: `${p.type}${p.name ? ` · ${p.name}` : ""}` })),
  ];

  return (
    <div className="stack loose" data-testid="plan-editor">
      <div className="card">
        <div className="row between wrap">
          <h2>{part ? `Drawing: ${part.type}${part.name ? ` · ${part.name}` : ""}` : "Whole route (total work)"}</h2>
          {part && <Button kind="soft" small onClick={() => setEditing("route")} testId="plan-done-part">Done with this part</Button>}
        </div>
        {part ? (
          <LineEditor key={part.id} line={part} onChange={(l) => setPart(part.id, l)} color={typeColor(part.type, plan.types)} others={behind} fitKey={`part-${part.id}`} testId="plan-part" />
        ) : (
          <LineEditor key="route" line={route} onChange={setRoute} color="#5b3fe6" others={behind} fitKey="route" testId="plan-route" />
        )}
      </div>

      <div className="card" data-testid="plan-parts">
        <div className="row between wrap"><h2>Work parts</h2><Button small onClick={() => setAdding(true)} testId="plan-add-part">+ Add a part</Button></div>
        <p className="small muted">Mark where each kind of work goes: open trench, HDD, cable laying, or a type you add.</p>
        {plan.parts.length ? (
          <div className="list" style={{ boxShadow: "none" }}>
            {plan.parts.map((p) => (
              <div key={p.id} className="item" style={{ alignItems: "flex-start" }} data-testid="plan-part-row">
                <span aria-hidden="true" style={{ width: 8, alignSelf: "stretch", borderRadius: 4, background: typeColor(p.type, plan.types), flex: "none" }} />
                <div className="grow">
                  <div className="title">{p.type}{p.name ? ` · ${p.name}` : ""}</div>
                  <div className="sub">{p.path.length > 1 ? `${metres(p.lengthM)} ${p.follow ? "along the road" : "straight"}` : "not drawn yet"}</div>
                  <div className="row wrap" style={{ marginTop: 6 }}>
                    <Button kind={editing === p.id ? "primary" : "soft"} small onClick={() => setEditing(p.id)}>{editing === p.id ? "Drawing now" : "Edit on the map"}</Button>
                    <Button kind="ghost" small onClick={() => setRemoving(p)}>Delete</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <Empty title="No work parts yet">Tap + Add a part, choose the type, then draw it on the map.</Empty>}
      </div>

      <div className="card" data-testid="plan-totals">
        <h2>Totals on the map</h2>
        <dl className="kv">
          <dt><b>Whole route</b></dt><dd><b>{metres(t.routeM)}</b></dd>
          {t.types.map((x) => <FragmentRow key={x.type} label={`${x.type} (${x.parts} part${x.parts > 1 ? "s" : ""})`} value={metres(x.lengthM)} color={x.color} />)}
          {t.routeM > 0 && plan.parts.length > 0 && <><dt>Not planned yet</dt><dd>{metres(t.notPlannedM)}</dd></>}
        </dl>
        <p className="tiny muted">Measured on the map along the drawn lines. Parts that overlap are counted in each part.</p>
      </div>

      <AddPart open={adding} plan={plan} onClose={() => setAdding(false)} onAdd={(type, name, types) => {
        const id = `part-${Date.now().toString(36)}`;
        onChange({ ...plan, types, parts: [...plan.parts, { ...emptyLine(followsByDefault(type)), id, type, name }] });
        setAdding(false); setEditing(id);
      }} />
      <Sheet open={!!removing} onClose={() => setRemoving(null)} label="Delete this part">
        <h2>Delete {removing?.type}{removing?.name ? ` · ${removing.name}` : ""}?</h2>
        <p className="muted">It leaves the plan when you save the project. The change log keeps the old plan.</p>
        <div className="btn-row">
          <Button kind="ghost" onClick={() => setRemoving(null)}>Keep it</Button>
          <Button kind="danger" onClick={() => { if (removing) { onChange({ ...plan, parts: plan.parts.filter((p) => p.id !== removing.id) }); if (editing === removing.id) setEditing("route"); } setRemoving(null); }} testId="plan-delete-yes">Delete</Button>
        </div>
      </Sheet>
    </div>
  );
}

function FragmentRow({ label, value, color }: { label: string; value: string; color: string }) {
  return <><dt><span aria-hidden="true" style={{ display: "inline-block", width: 10, height: 10, borderRadius: 5, background: color, marginRight: 6 }} />{label}</dt><dd>{value}</dd></>;
}

// + Add a part: the type from the list, or "+ New type…" (a name the admin writes, kept in the list)
function AddPart({ open, plan, onClose, onAdd }: { open: boolean; plan: ProjectPlan; onClose: () => void; onAdd: (type: string, name: string, types: string[]) => void }) {
  const [type, setType] = useState("");
  const [name, setName] = useState("");
  const [newType, setNewType] = useState("");
  const [askNew, setAskNew] = useState(false);
  const pick = (v: string) => { if (v === NEW_TYPE) { setAskNew(true); setNewType(""); } else setType(v); };
  const keepNew = () => {
    const t = newType.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!t) return;
    const known = plan.types.find((x) => x.toLowerCase() === t.toLowerCase());
    setType(known ?? t); setAskNew(false);
  };
  const types = plan.types.includes(type) || !type ? plan.types : [...plan.types, type];
  return (
    <Sheet open={open} onClose={onClose} label="Add a work part">
      {askNew ? (
        <>
          <h2>New type of work</h2>
          <TextInput label="Name of the type" value={newType} onChange={setNewType} maxLength={40} placeholder="For example: Duct laying, Road restoration" testId="plan-new-type" />
          <div className="btn-row"><Button kind="ghost" onClick={() => setAskNew(false)}>Back</Button><Button onClick={keepNew} disabled={!newType.trim()} testId="plan-new-type-keep">Use this type</Button></div>
        </>
      ) : (
        <>
          <h2>Add a work part</h2>
          <Select label="Type of work" value={type} onChange={pick} placeholder="Choose the type" testId="plan-part-type"
            options={[...types.map((x) => ({ value: x, label: x })), { value: NEW_TYPE, label: "+ New type…" }]} />
          <TextInput label="Name (optional)" value={name} onChange={setName} maxLength={80} placeholder="For example: School road stretch" testId="plan-part-name" />
          <p className="tiny muted">{type === "HDD" ? "An HDD part is drawn in straight lines (a bore goes under the road); you can switch it to follow the roads." : "The line follows the roads as you tap along them."}</p>
          <div className="btn-row">
            <Button kind="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { onAdd(type, name.trim(), types); setType(""); setName(""); }} disabled={!type} testId="plan-part-add">Add, then draw it</Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
