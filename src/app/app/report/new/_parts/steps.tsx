"use client";
// The daily report, in the order the day is done (owner's ask, 28 Sep 2026): work done today, workers and
// wages, expenses, then anything else. Choices are drop-downs. Each part edits one piece of the report;
// the totals are worked out from the lists (shared/report.ts summarize), never typed.
import { Button, NumberInput, PhotoPicker, Select, Stepper, TextArea, TextInput, Pill } from "@/components/ui";
import { RouteEditor } from "@/components/Map";
import { money, numIN, metres } from "@/lib/shared/format";
import { newRef } from "@/lib/client/api";
import {
  AGENCIES, CLEARANCE_LABEL, EXPENSE_CATEGORIES, EXPENSE_LABEL, STRATA, WORK, hddFromRods, summarize,
  type Clearance, type ClearanceStatus, type Expense, type ExpenseCategory, type Hdd, type Pic, type ReportBody, type WorkItem, type WorkKey,
} from "@/lib/shared/report";
import type { ProjectView } from "@/lib/shared/project";
import type { LatLng } from "@/lib/shared/geo";

type Set = (fn: (b: ReportBody) => ReportBody) => void;

// ---------------------------------------------------------------- 2. Work done today
export function WorkStep({ body, set, project }: { body: ReportBody; set: Set; project: ProjectView | null }) {
  const has = (k: WorkKey) => body.work.find((w) => w.key === k);
  const setW = (k: WorkKey, patch: Partial<WorkItem>) => set((b) => ({ ...b, work: b.work.map((w) => (w.key === k ? { ...w, ...patch } : w)) }));
  const add = (k: WorkKey) => set((b) => {
    if (b.work.some((w) => w.key === k)) return b;
    const hdd: Hdd | null = k === "hdd" ? (b.hdd ?? { machine: project?.hddDefaults.machine ?? "", vendor: project?.hddDefaults.vendor ?? "", tracker: project?.hddDefaults.tracker ?? "", operator: project?.hddDefaults.operator ?? "", ducts: project?.hddDefaults.ducts ?? "", rodLengthM: project?.hddDefaults.rodLengthM ?? null, rods: [] }) : b.hdd;
    return { ...b, work: [...b.work, { key: k, value: 0, note: "", photos: [], route: [] }], hdd };
  });
  const remove = (k: WorkKey) => set((b) => ({ ...b, work: b.work.filter((w) => w.key !== k), hdd: k === "hdd" ? null : b.hdd }));
  const left = WORK.filter((w) => !has(w.key));
  return (
    <div className="stack loose">
      {left.length > 0 && (
        <div className="card">
          <Select label={body.work.length ? "Add more work" : "Type of work"} value="" onChange={(v) => add(v as WorkKey)} placeholder="Choose the work done today" testId="work-type"
            options={left.map((w) => ({ value: w.key, label: w.label }))} />
          <p className="tiny muted">Choose each kind of work done today. Then write how much, and add photos.</p>
        </div>
      )}
      {WORK.filter((w) => has(w.key)).map((w) => {
        const item = has(w.key)!;
        const fromRods = w.key === "hdd" ? hddFromRods(body.hdd) : 0;
        return (
          <div key={w.key} className="card" data-testid={`work-card-${w.key}`}>
            <div className="row between"><h2>{w.label}</h2><button type="button" className="link-btn" onClick={() => remove(w.key)}>Remove</button></div>
            <NumberInput label={w.unit === "m" ? "How many metres today" : "How many today"} unit={w.unit === "m" ? "m" : ""} decimals={w.unit === "m"} value={item.value || null}
              onChange={(v) => setW(w.key, { value: v ?? 0 })} testId={`work-value-${w.key}`}
              hint={w.key === "hdd" && fromRods ? `The rod log gives ${metres(fromRods)} (used if you leave this empty).` : undefined} />
            <PhotoPicker label="Photos" kind="work" max={6} pics={item.photos} onChange={(p) => setW(w.key, { photos: p })} testId={`work-photos-${w.key}`} />
            <TextArea label="Note (optional)" value={item.note} onChange={(v) => setW(w.key, { note: v })} rows={1} testId={`work-note-${w.key}`} />
            {w.route && (
              <details>
                <summary className="link-btn" style={{ display: "inline-block" }}>{item.route.length ? `Where on the map (${item.route.length} points)` : "Mark where on the map (optional)"}</summary>
                <RouteEditor points={item.route} onChange={(p: LatLng[]) => setW(w.key, { route: p })} others={project && project.route.length > 1 ? [{ points: project.route, color: "#b8b0ff", weight: 4, dashed: true, title: "Project route" }] : []} />
              </details>
            )}
          </div>
        );
      })}
      {has("hdd") && body.hdd && <HddCard hdd={body.hdd} onChange={(h) => set((b) => ({ ...b, hdd: h }))} />}
      <div className="card">
        <TextArea label="What was done today (short note)" value={body.notes.workDone} onChange={(v) => set((b) => ({ ...b, notes: { ...b.notes, workDone: v } }))} rows={3} testId="note-work" placeholder="For example: cable laid from the junction to the school" />
      </div>
    </div>
  );
}

function HddCard({ hdd, onChange }: { hdd: Hdd; onChange: (h: Hdd) => void }) {
  const p = (k: keyof Hdd, v: unknown) => onChange({ ...hdd, [k]: v });
  const setRod = (i: number, k: string, v: string) => onChange({ ...hdd, rods: hdd.rods.map((r, j) => (j === i ? { ...r, [k]: v } : r)) });
  return (
    <div className="card" data-testid="hdd-card">
      <h2>HDD rod log</h2>
      <NumberInput label="Length of one rod" unit="m" value={hdd.rodLengthM} onChange={(v) => p("rodLengthM", v)} testId="hdd-rod-length" />
      {hdd.rods.map((r, i) => (
        <div key={i} className="card" style={{ boxShadow: "none", background: "var(--soft)" }}>
          <div className="row between"><b>Rod {i + 1}{hdd.rodLengthM ? ` · at ${metres((i + 1) * hdd.rodLengthM)}` : ""}</b><button type="button" className="link-btn" onClick={() => onChange({ ...hdd, rods: hdd.rods.filter((_, j) => j !== i).map((x, j) => ({ ...x, no: j + 1 })) })}>Remove</button></div>
          <div className="grid2">
            <TextInput label="Depth (m)" value={r.depth} onChange={(v) => setRod(i, "depth", v)} inputMode="decimal" maxLength={12} testId={`rod-depth-${i}`} />
            <TextInput label="Pitch (%)" value={r.pitch} onChange={(v) => setRod(i, "pitch", v)} inputMode="decimal" maxLength={12} testId={`rod-pitch-${i}`} />
          </div>
          <Select label="Soil" value={r.strata} onChange={(v) => setRod(i, "strata", v)} placeholder="Choose" options={STRATA.map((x) => ({ value: x, label: x }))} />
          <TextInput label="Crossing (road, drain, pipe…)" value={r.crossing} onChange={(v) => setRod(i, "crossing", v)} maxLength={120} />
        </div>
      ))}
      <Button kind="soft" onClick={() => onChange({ ...hdd, rods: [...hdd.rods, { no: hdd.rods.length + 1, pitch: "", depth: hdd.rods[hdd.rods.length - 1]?.depth ?? "", strata: hdd.rods[hdd.rods.length - 1]?.strata ?? "", crossing: "" }] })} testId="rod-add">Add a rod</Button>
      {hdd.rods.length > 1 && <BoreProfile hdd={hdd} />}
      <p className="small muted">{hdd.rods.length} rods{hdd.rodLengthM ? ` × ${numIN(hdd.rodLengthM)} m = ${metres(hddFromRods(hdd))}` : " (enter the rod length to work out the metres)"}</p>
      <details>
        <summary className="link-btn" style={{ display: "inline-block" }}>Machine, operator and ducts (optional)</summary>
        <div className="grid2">
          <TextInput label="Machine" value={hdd.machine} onChange={(v) => p("machine", v)} />
          <TextInput label="Vendor / contractor" value={hdd.vendor} onChange={(v) => p("vendor", v)} />
          <TextInput label="Tracker / surveyor" value={hdd.tracker} onChange={(v) => p("tracker", v)} />
          <TextInput label="Operator" value={hdd.operator} onChange={(v) => p("operator", v)} />
          <TextInput label="Ducts / colour" value={hdd.ducts} onChange={(v) => p("ducts", v)} />
        </div>
      </details>
    </div>
  );
}

// the drill's depth along the bore, from the rod log (drawn from the numbers entered, nothing added)
export function BoreProfile({ hdd }: { hdd: Hdd }) {
  const L = hdd.rodLengthM ?? 1;
  const pts = [{ x: 0, y: 0 }, ...hdd.rods.map((r, i) => ({ x: (i + 1) * L, y: Number(String(r.depth).replace(",", ".")) || 0 }))];
  const maxX = Math.max(...pts.map((q) => q.x), 1), maxY = Math.max(...pts.map((q) => q.y), 1);
  const W = 320, H = 150, px = (x: number) => 30 + (x / maxX) * (W - 40), py = (y: number) => 14 + (y / maxY) * (H - 34);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bore depth along the drill" style={{ width: "100%", background: "#fff", borderRadius: 12, border: "1px solid var(--line)" }}>
      <line x1="30" y1="14" x2={W - 10} y2="14" stroke="#8a8eab" strokeDasharray="4 4" />
      <text x="4" y="18" fontSize="10" fill="#5e6283">0 m</text>
      <text x="4" y={py(maxY) + 4} fontSize="10" fill="#5e6283">{numIN(maxY, 1)} m</text>
      <text x={W - 10} y={H - 6} fontSize="10" fill="#5e6283" textAnchor="end">{numIN(maxX, 1)} m along</text>
      <polyline fill="none" stroke="#5b3fe6" strokeWidth="3" points={pts.map((q) => `${px(q.x)},${py(q.y)}`).join(" ")} />
      {pts.slice(1).map((q, i) => <circle key={i} cx={px(q.x)} cy={py(q.y)} r="3" fill="#13d3e3" />)}
    </svg>
  );
}

// ---------------------------------------------------------------- 3. Workers and wages
export function CrewStep({ body, set, project }: { body: ReportBody; set: Set; project: ProjectView | null }) {
  const s = summarize(body);
  const crew = body.crew;
  const setCrew = (patch: Partial<ReportBody["crew"]>) => set((b) => ({ ...b, crew: { ...b.crew, ...patch } }));
  return (
    <div className="stack loose">
      <div className="card">
        <Stepper label="Workers at site today" value={crew.workers} onChange={(v) => setCrew({ workers: v })} testId="crew-workers" />
        <NumberInput label="Wage for one worker for the day" unit="₹" value={crew.wageRate} onChange={(v) => setCrew({ wageRate: v })} testId="crew-rate"
          hint={project?.standardWage ? `The project's usual wage is ${money(project.standardWage)}.` : undefined} />
      </div>
      {crew.ot.map((g, i) => (
        <div key={i} className="card">
          <div className="row between"><b>Overtime {crew.ot.length > 1 ? i + 1 : ""}</b><button type="button" className="link-btn" onClick={() => setCrew({ ot: crew.ot.filter((_, j) => j !== i) })}>Remove</button></div>
          <div className="grid3">
            <NumberInput label="Workers" value={g.workers} decimals={false} onChange={(v) => setCrew({ ot: crew.ot.map((x, j) => (j === i ? { ...x, workers: v ?? 0 } : x)) })} testId={`ot-workers-${i}`} />
            <NumberInput label="Hours" value={g.hours} onChange={(v) => setCrew({ ot: crew.ot.map((x, j) => (j === i ? { ...x, hours: v ?? 0 } : x)) })} testId={`ot-hours-${i}`} />
            <NumberInput label="₹ per hour" value={g.rate} onChange={(v) => setCrew({ ot: crew.ot.map((x, j) => (j === i ? { ...x, rate: v ?? 0 } : x)) })} testId={`ot-rate-${i}`} />
          </div>
          <span className="small muted">{g.workers} × {numIN(g.hours)} h × {money(g.rate)} = <b>{money(g.workers * g.hours * g.rate)}</b></span>
        </div>
      ))}
      <Button kind="soft" onClick={() => setCrew({ ot: [...crew.ot, { workers: 1, hours: 1, rate: 0, note: "" }] })} testId="ot-add">{crew.ot.length ? "Add more overtime" : "Add overtime (optional)"}</Button>
      <div className="card hero"><span className="muted">Wages today</span><h1 data-testid="wages-total">{money(s.wages)}</h1><span className="muted small">{crew.workers} × {money(crew.wageRate ?? 0)}{crew.ot.length ? ` + overtime ${money(s.wages - crew.workers * (crew.wageRate ?? 0))}` : ""}</span></div>
      <div className="card"><TextArea label="Note about the workers (optional)" value={crew.wagesNote} onChange={(v) => setCrew({ wagesNote: v })} rows={1} testId="crew-note" /></div>
    </div>
  );
}

// ---------------------------------------------------------------- 4. Expenses
export function ExpensesStep({ body, set }: { body: ReportBody; set: Set }) {
  const s = summarize(body);
  const setE = (i: number, patch: Partial<Expense>) => set((b) => ({ ...b, expenses: b.expenses.map((e, j) => (j === i ? { ...e, ...patch } : e)) }));
  const add = (category: ExpenseCategory) => set((b) => ({ ...b, expenses: [...b.expenses, { id: newRef().slice(0, 12), category, amount: 0, name: "", note: "", bill: null }] }));
  const options = EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_LABEL[c] }));
  return (
    <div className="stack loose">
      {body.expenses.map((e, i) => (
        <div key={e.id} className="card" data-testid={`expense-${i}`}>
          <div className="row between"><b>Expense {i + 1}</b><button type="button" className="link-btn" onClick={() => set((b) => ({ ...b, expenses: b.expenses.filter((_, j) => j !== i) }))}>Remove</button></div>
          <Select label="Type of expense" value={e.category} onChange={(v) => setE(i, { category: v as ExpenseCategory })} options={options} testId={`expense-category-${i}`} />
          <NumberInput label="Amount" unit="₹" value={e.amount || null} onChange={(v) => setE(i, { amount: v ?? 0 })} testId={`expense-amount-${i}`} />
          {(e.category === "tool" || e.category === "other") && <TextInput label={e.category === "tool" ? "Which tool" : "What for"} value={e.name} onChange={(v) => setE(i, { name: v })} maxLength={120} />}
          <PhotoPicker label="Photo of the bill" kind="bill" max={1} allowPdf pics={e.bill ? [e.bill] : []} onChange={(p) => setE(i, { bill: p[0] ?? null })} testId={`expense-bill-${i}`} />
          <TextArea label="Note (optional)" value={e.note} onChange={(v) => setE(i, { note: v })} rows={1} />
        </div>
      ))}
      <div className="card">
        <Select label={body.expenses.length ? "Add another expense" : "Type of expense"} value="" onChange={(v) => add(v as ExpenseCategory)} placeholder={body.expenses.length ? "Choose the type" : "Choose, or leave empty if none today"} options={options} testId="expense-type" />
        <p className="tiny muted">One line for each bill, with a photo of the bill.</p>
      </div>
      <div className="card hero">
        <span className="muted">Expenses today</span><h1 data-testid="expenses-total">{money(s.expenses)}</h1>
        <span className="muted small">{EXPENSE_CATEGORIES.filter((c) => s[c] > 0).map((c) => `${EXPENSE_LABEL[c]} ${money(s[c])}`).join(" · ") || "none"}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Anything else? (optional, folded)
export function MoreStep({ body, set }: { body: ReportBody; set: Set }) {
  const n = body.notes;
  const setN = (patch: Partial<ReportBody["notes"]>) => set((b) => ({ ...b, notes: { ...b.notes, ...patch } }));
  const filled = [n.problems, n.plans, n.toAdmin].filter(Boolean).length + (n.moneyNeeded ? 1 : 0) + body.clearances.length;
  return (
    <details className="card" data-testid="report-more" open={filled > 0}>
      <summary style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center" }}><b>Anything else? (optional){filled ? ` · ${filled} filled` : ""}</b></summary>
      <div className="stack loose" style={{ marginTop: 10 }}>
        <TextArea label="Problems at site" value={n.problems} onChange={(v) => setN({ problems: v })} rows={2} testId="note-problems" />
        <TextArea label="Plan for tomorrow" value={n.plans} onChange={(v) => setN({ plans: v })} rows={2} testId="note-plans" />
        <NumberInput label="Money needed" unit="₹" value={n.moneyNeeded} onChange={(v) => setN({ moneyNeeded: v })} testId="note-money" />
        {n.moneyNeeded ? <TextArea label="What the money is for" value={n.moneyReason} onChange={(v) => setN({ moneyReason: v })} rows={2} testId="note-money-reason" /> : null}
        {n.moneyNeeded ? <PhotoPicker label="Estimate or bill (if any)" kind="bill" max={1} allowPdf pics={n.moneyReceipt ? [n.moneyReceipt] : []} onChange={(p) => setN({ moneyReceipt: (p[0] as Pic) ?? null })} /> : null}
        <Permissions body={body} set={set} />
        <TextArea label="Message to the director" value={n.toAdmin} onChange={(v) => setN({ toAdmin: v })} rows={2} testId="note-admin" />
      </div>
    </details>
  );
}

// permissions: only when something changed today (road cutting, crossing, NOC)
function Permissions({ body, set }: { body: ReportBody; set: Set }) {
  const list = body.clearances;
  const find = (a: string) => list.find((c) => c.agency === a);
  const upsert = (a: string, patch: Partial<Clearance>) => set((b) => {
    const cur = b.clearances.find((c) => c.agency === a) ?? { agency: a, status: "none" as ClearanceStatus, note: "", receipt: null };
    const next = { ...cur, ...patch };
    const rest = b.clearances.filter((c) => c.agency !== a);
    return { ...b, clearances: next.status === "none" && !next.receipt && !next.note ? rest : [...rest, next] };
  });
  const others = list.filter((c) => !(AGENCIES as readonly string[]).includes(c.agency));
  const statuses = (Object.keys(CLEARANCE_LABEL) as ClearanceStatus[]).map((k) => ({ value: k, label: CLEARANCE_LABEL[k] }));
  return (
    <div className="stack">
      <b>Permissions (only if something changed today)</b>
      {[...AGENCIES, ...others.map((o) => o.agency)].map((a) => {
        const c = find(a);
        return (
          <div key={a} className="stack tight" data-testid={`permission-${a}`}>
            <div className="row between"><span className="small strong">{a}</span>{c && c.status !== "none" && <Pill tone={c.status === "granted" ? "ok" : "warn"}>{CLEARANCE_LABEL[c.status]}</Pill>}</div>
            <Select label={`${a} permission`} value={c?.status ?? "none"} onChange={(v) => upsert(a, { status: v as ClearanceStatus })} options={statuses} />
            {c && <TextArea label="Note" value={c.note} onChange={(v) => upsert(a, { note: v })} rows={1} />}
            {c && <PhotoPicker label="Receipt or letter" kind="clearance" max={1} allowPdf pics={c.receipt ? [c.receipt] : []} onChange={(p) => upsert(a, { receipt: p[0] ?? null })} />}
          </div>
        );
      })}
      <OtherAgency onAdd={(name) => upsert(name, { status: "applied" })} />
    </div>
  );
}

function OtherAgency({ onAdd }: { onAdd: (name: string) => void }) {
  return (
    <form className="stack tight" onSubmit={(e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get("agency") ?? "").trim(); if (v.length > 1) { onAdd(v); e.currentTarget.reset(); } }}>
      <div className="field"><label htmlFor="agency-other">Another office</label><input id="agency-other" name="agency" className="input" maxLength={40} placeholder="e.g. Railways, Water Authority" /></div>
      <button className="btn soft" type="submit">Add it</button>
    </form>
  );
}
