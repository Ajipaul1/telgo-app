"use client";
// One daily report, as its supervisor, the admin, accounts or a client may see it.
import { Fragment, useState } from "react";
import { useApp } from "./AppContext";
import { Button, ErrorNote, Listen, Loaded, NumberInput, Pill, PicThumb, Select, Sheet, TextArea, Empty } from "./ui";
import { MapView } from "./Map";
import { BoreProfile } from "@/app/app/report/new/_parts/steps";
import { useLoad } from "@/lib/client/hooks";
import { call, ApiError } from "@/lib/client/api";
import { fmtDayLong, fmtWhen, money, metres, numIN } from "@/lib/shared/format";
import { CLEARANCE_LABEL, EXPENSE_CATEGORIES, EXPENSE_LABEL, STATUS_WORDS, WORK, WORK_LABEL, statusTone, type ReportView } from "@/lib/shared/report";
import type { ProjectView } from "@/lib/shared/project";

type Msg = { id: string; senderId: string; senderName: string; senderRole: string; message: string; item: string | null; kind: string; at: string };
type Data = { report: ReportView; messages: Msg[]; canFix: boolean; canDecide: boolean };

export function ReportDetail({ id }: { id: string }) {
  const { me } = useApp();
  const load = useLoad<Data>(`/api/reports/${id}`, { every: 20 });
  return (
    <Loaded load={load}>
      {(d) => <Body data={d} onChange={(r) => load.set((x) => x && { ...x, report: r, canDecide: me?.role === "admin" && r.status !== "approved", canFix: x.canFix && r.status !== "approved" })} reload={load.reload} />}
    </Loaded>
  );
}

function Body({ data, onChange, reload }: { data: Data; onChange: (r: ReportView) => void; reload: () => Promise<void> }) {
  const { me } = useApp();
  const r = data.report;
  const b = r.body;
  const s = r.summary;
  const client = me?.role === "client";
  const lastFix = [...data.messages].reverse().find((m) => m.kind === "ask_fix");
  return (
    <>
      <div className="card" data-testid="report-head">
        <div className="row between"><h1 className="ellipsis">{r.projectName ?? "Unknown project"}</h1><Pill tone={statusTone(r.status)}>{STATUS_WORDS[r.status]}</Pill></div>
        <p className="muted">{fmtDayLong(r.reportDate)}</p>
        <dl className="kv">
          <dt>Sent by</dt><dd>{r.supervisorName}</dd>
          <dt>Sent</dt><dd>{fmtWhen(r.createdAt)}</dd>
          {r.updatedAt !== r.createdAt && <><dt>Last changed</dt><dd>{fmtWhen(r.updatedAt)}</dd></>}
          {r.approvedAt && <><dt>Approved</dt><dd>{fmtWhen(r.approvedAt)}{r.approvedByName ? ` by ${r.approvedByName}` : ""}</dd></>}
        </dl>
        {!r.projectName && <div className="notice warn">This report points at a project that doesn&apos;t exist ({r.projectId}): a sample project of the old app. {me?.role === "admin" ? "Correct the numbers → Project moves it to the right one." : ""}</div>}
        {r.fromOldApp && <p className="tiny muted">Sent with the old app: some details (like the HDD machine) were never saved by it.</p>}
      </div>

      {r.status === "clarification" && lastFix && (
        <div className="notice bad" data-testid="fix-request"><b>The admin asked to fix this</b><span>{lastFix.message}</span><span className="ref">{lastFix.senderName} · {fmtWhen(lastFix.at)}</span><Listen text={lastFix.message} /></div>
      )}
      {data.canFix && <Button big block href={`/app/report/new?edit=${r.id}`} testId="fix-report">Fix this report</Button>}
      {data.canDecide && <AdminActions report={r} onChange={onChange} />}
      {me?.role === "admin" && r.status === "approved" && <AdminEdit report={r} onChange={onChange} />}

      {!client && (
        <div className="card hero" data-testid="report-summary">
          <span className="muted">Total cost this day</span>
          <h1>{money(s.wages + s.expenses)}</h1>
          <span className="muted small">Wages {money(s.wages)} ({b.crew.workers} workers) · Expenses {money(s.expenses)}</span>
        </div>
      )}

      <div className="card" data-testid="section-work">
        <h2>Work done today</h2>
        {b.work.length ? b.work.map((w) => {
          const def = WORK.find((x) => x.key === w.key)!;
          const v = w.key === "hdd" ? s.hdd : w.value;
          return (
            <div key={w.key} className="stack tight">
              <div className="row between"><b>{WORK_LABEL[w.key]}</b><b>{def.unit === "m" ? metres(v) : numIN(v, 0)}</b></div>
              {w.note && <p className="small">{w.note}</p>}
              {w.photos.length > 0 && <div className="thumbs">{w.photos.map((p, i) => <PicThumb key={i} pic={p} label={`${WORK_LABEL[w.key]} photo ${i + 1}`} />)}</div>}
              {w.route.length > 1 && <MapView size="short" lines={[{ points: w.route, color: "#0e8a5f" }]} pins={[{ at: w.route[0], text: "S", kind: "start", title: "Start" }, { at: w.route[w.route.length - 1], text: "E", kind: "end", title: "End" }]} />}
              <div className="hr" />
            </div>
          );
        }) : <p className="small muted">No work recorded.</p>}
      </div>

      {b.hdd && (
        <div className="card" data-testid="section-hdd">
          <div className="card-title"><h2>HDD</h2>{!client && <a className="link-btn" href={`/app/reports/print/${r.id}`}>Print the HDD sheet</a>}</div>
          <dl className="kv">
            <dt>Machine</dt><dd>{b.hdd.machine || "—"}</dd><dt>Vendor</dt><dd>{b.hdd.vendor || "—"}</dd><dt>Tracker</dt><dd>{b.hdd.tracker || "—"}</dd>
            <dt>Operator</dt><dd>{b.hdd.operator || "—"}</dd><dt>Ducts</dt><dd>{b.hdd.ducts || "—"}</dd><dt>Rod length</dt><dd>{b.hdd.rodLengthM ? `${numIN(b.hdd.rodLengthM)} m` : "not recorded"}</dd>
            <dt>Rods</dt><dd>{b.hdd.rods.length}</dd>
          </dl>
          {b.hdd.rods.length > 1 && <BoreProfile hdd={b.hdd} />}
          {b.hdd.rods.length > 0 && (
            <div className="list" style={{ boxShadow: "none", maxHeight: 280, overflowY: "auto" }}>
              {b.hdd.rods.map((x) => <div key={x.no} className="item" style={{ minHeight: 44, padding: "8px 12px" }}><b style={{ width: 54 }}>Rod {x.no}</b><span className="grow small">pitch {x.pitch || "—"} · depth {x.depth || "—"} m · {x.strata || "—"}{x.crossing ? ` · ${x.crossing}` : ""}</span></div>)}
            </div>
          )}
        </div>
      )}

      {!client && (
        <div className="card" data-testid="section-crew">
          <h2>Workers and wages</h2>
          <dl className="kv">
            <dt>Workers</dt><dd>{b.crew.workers}</dd>
            <dt>Daily wage per worker</dt><dd>{b.crew.wageRate === null ? "not recorded" : money(b.crew.wageRate)}</dd>
            {b.crew.ot.map((g, i) => <Fragment key={i}><dt>Overtime {i + 1}</dt><dd>{g.workers} × {numIN(g.hours)} h × {money(g.rate)}</dd></Fragment>)}
            <dt><b>Wages</b></dt><dd>{money(s.wages)}</dd>
          </dl>
          {b.crew.wagesNote && <p className="small">{b.crew.wagesNote}</p>}
        </div>
      )}
      {client && <div className="card"><h2>Crew</h2><p>{b.crew.workers} workers at site</p></div>}

      {!client && (
        <div className="card" data-testid="section-expenses">
          <div className="card-title"><h2>Expenses</h2><b>{money(s.expenses)}</b></div>
          {b.expenses.length ? b.expenses.map((e) => (
            <div key={e.id} className="row" style={{ alignItems: "flex-start" }}>
              {e.bill ? <PicThumb pic={e.bill} label={`${EXPENSE_LABEL[e.category]} bill`} /> : <span className="thumb pdf" style={{ fontWeight: 600, color: "var(--faint)" }}>No bill</span>}
              <div className="grow"><b>{EXPENSE_LABEL[e.category]}{e.name ? `: ${e.name}` : ""}</b><div>{money(e.amount)}</div>{e.note && <div className="small muted">{e.note}</div>}</div>
            </div>
          )) : <p className="small muted">No expenses.</p>}
          {b.expenses.length > 0 && <p className="tiny muted">{EXPENSE_CATEGORIES.filter((c) => s[c] > 0).map((c) => `${EXPENSE_LABEL[c]} ${money(s[c])}`).join(" · ")}</p>}
        </div>
      )}

      {b.clearances.length > 0 && (
        <div className="card" data-testid="section-permissions">
          <h2>Permissions</h2>
          {b.clearances.map((c) => (
            <div key={c.agency} className="row" style={{ alignItems: "flex-start" }}>
              {c.receipt && <PicThumb pic={c.receipt} label={`${c.agency} receipt`} />}
              <div className="grow"><b>{c.agency}</b> <Pill tone={c.status === "granted" ? "ok" : "warn"}>{CLEARANCE_LABEL[c.status]}</Pill>{c.note && <div className="small muted">{c.note}</div>}</div>
            </div>
          ))}
        </div>
      )}

      {(b.notes.workDone || b.notes.problems || b.notes.plans || b.notes.toAdmin || b.notes.moneyNeeded) && (
        <div className="card" data-testid="section-notes">
          <h2>Notes</h2>
          {([["Work done today", b.notes.workDone], ["Problems at site", b.notes.problems], ["Plan for tomorrow", b.notes.plans], ["Message to the director", b.notes.toAdmin]] as const).filter(([, t]) => t).map(([l, t]) => (
            <div key={l}><div className="row between"><b className="small">{l}</b><Listen text={t} /></div><p>{t}</p></div>
          ))}
          {!client && b.notes.moneyNeeded ? (
            <div className="notice warn"><b>Money needed: {money(b.notes.moneyNeeded)}</b><span>{b.notes.moneyReason}</span>{b.notes.moneyReceipt && <PicThumb pic={b.notes.moneyReceipt} label="Estimate" />}</div>
          ) : null}
        </div>
      )}

      {!client && <Messages reportId={r.id} initial={data.messages} canWrite={me?.role === "admin" || r.supervisorId === me?.id} onSent={reload} />}
    </>
  );
}

function AdminActions({ report, onChange }: { report: ReportView; onChange: (r: ReportView) => void }) {
  const { toast, refreshCounts } = useApp();
  const [sheet, setSheet] = useState<"approve" | "fix" | null>(null);
  const [message, setMessage] = useState("");
  const [item, setItem] = useState("");
  const [err, setErr] = useState<ApiError | null>(null);
  const decide = async (action: "approve" | "ask_fix") => {
    setErr(null);
    try {
      const r = await call<{ report: ReportView }>(`/api/reports/${report.id}/decide`, { body: { action, expected: report.updatedAt, message, item } });
      onChange(r.report); setSheet(null); setMessage(""); refreshCounts();
      toast(action === "approve" ? "Report approved." : "Sent back to the supervisor.");
    } catch (e) { setErr(e as ApiError); }
  };
  return (
    <div className="card line-warn" data-testid="admin-actions">
      <h2>Your decision</h2>
      <div className="btn-row">
        <Button kind="ok" onClick={() => { setErr(null); setSheet("approve"); }} testId="approve">Approve</Button>
        <Button kind="warn" onClick={() => { setErr(null); setSheet("fix"); }} testId="ask-fix">Ask to fix</Button>
      </div>
      <Sheet open={sheet === "approve"} onClose={() => setSheet(null)} label="Approve">
        <h2>Approve this report?</h2>
        <p className="muted">Its numbers go into the totals and it is locked. {report.supervisorName} is told.</p>
        {err && <ErrorNote error={err} />}
        <div className="btn-row"><Button kind="ghost" onClick={() => setSheet(null)}>Not now</Button><Button kind="ok" onClick={() => decide("approve")} busyText="Approving…" testId="approve-confirm">Approve</Button></div>
      </Sheet>
      <Sheet open={sheet === "fix"} onClose={() => setSheet(null)} label="Ask to fix">
        <h2>What needs fixing?</h2>
        <Select label="About" value={item} onChange={setItem} placeholder="Choose (optional)" options={[{ value: "crew", label: "Crew and wages" }, { value: "expenses", label: "Expenses and bills" }, { value: "work", label: "Work done" }, { value: "hdd", label: "HDD" }, { value: "permissions", label: "Permissions" }, { value: "other", label: "Something else" }]} />
        <TextArea label="Tell the supervisor" value={message} onChange={setMessage} rows={3} testId="ask-fix-message" />
        {err && <ErrorNote error={err} />}
        <div className="btn-row"><Button kind="ghost" onClick={() => setSheet(null)}>Not now</Button><Button kind="warn" onClick={() => decide("ask_fix")} busyText="Sending…" disabled={message.trim().length < 3} testId="ask-fix-confirm">Send</Button></div>
      </Sheet>
    </div>
  );
}

const FIELDS: [string, string, (s: ReportView["summary"]) => number][] = [
  ["labor_count", "Workers", (s) => s.workers], ["ot_hours_exact", "Overtime worker-hours", (s) => s.otHours], ["calculated_wages", "Wages (₹)", (s) => s.wages],
  ["fuel_expenses", "Fuel (₹)", (s) => s.fuel], ["travel_expenses", "Travel (₹)", (s) => s.travel], ["room_rent", "Room rent (₹)", (s) => s.room],
  ["tool_rent", "Tool rent (₹)", (s) => s.tool], ["other_expenses", "Other (₹)", (s) => s.other], ["excavation_length", "Trenching (m)", (s) => s.trenching],
  ["hdd_length", "HDD (m)", (s) => s.hdd], ["cable_laying_length", "Cable laying (m)", (s) => s.cableLaying], ["cable_mounding_length", "Cable mounting (m)", (s) => s.cableMounting],
  ["joining_links_completed", "Joints", (s) => s.joints], ["rmu_foundation_status", "RMU foundations", (s) => s.rmu], ["termination_endpoints", "Terminations", (s) => s.terminations],
];

// the admin corrects numbers or the project, with a reason (also on an approved report)
function AdminEdit({ report, onChange }: { report: ReportView; onChange: (r: ReportView) => void }) {
  const { toast } = useApp();
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, number | null>>({});
  const [projectId, setProjectId] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<ApiError | null>(null);
  const projects = useLoad<{ projects: ProjectView[] }>(open ? "/api/projects" : null);
  const save = async () => {
    setErr(null);
    const patch: Record<string, unknown> = {};
    for (const [k] of FIELDS) if (vals[k] !== undefined && vals[k] !== null) patch[k] = vals[k];
    if (projectId) patch.project_id = projectId;
    try {
      const r = await call<{ report: ReportView }>(`/api/reports/${report.id}/admin-edit`, { body: { expected: report.updatedAt, patch, reason } });
      onChange(r.report); setOpen(false); setVals({}); setReason(""); toast("Correction saved. The change log keeps the old numbers.");
    } catch (e) { setErr(e as ApiError); }
  };
  return (
    <>
      <Button kind="ghost" block onClick={() => setOpen(true)} testId="admin-edit">Correct the numbers</Button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Correct the numbers">
        <h2>Correct the numbers</h2>
        <p className="small muted">Only what you change is saved. The reason is written on the report, and the change log keeps the old numbers.</p>
        <Select label="Project" value={projectId} onChange={setProjectId} placeholder={report.projectName ?? `Unknown (${report.projectId})`} options={(projects.data?.projects ?? []).map((p) => ({ value: p.id, label: p.name }))} />
        <div className="grid2">
          {FIELDS.map(([k, label, get]) => <NumberInput key={k} label={label} value={vals[k] ?? null} placeholder={String(get(report.summary))} onChange={(v) => setVals((x) => ({ ...x, [k]: v }))} />)}
        </div>
        <TextArea label="Why it is changed" value={reason} onChange={setReason} rows={2} testId="admin-edit-reason" />
        {err && <ErrorNote error={err} />}
        <div className="btn-row"><Button kind="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} busyText="Saving…" disabled={reason.trim().length < 3} testId="admin-edit-save">Save</Button></div>
      </Sheet>
    </>
  );
}

function Messages({ reportId, initial, canWrite, onSent }: { reportId: string; initial: Msg[]; canWrite: boolean; onSent: () => void }) {
  const { me } = useApp();
  const load = useLoad<{ messages: Msg[] }>(`/api/reports/${reportId}/messages`, { every: 15 });
  const list = load.data?.messages ?? initial;
  const [text, setText] = useState("");
  const [err, setErr] = useState<ApiError | null>(null);
  const send = async () => {
    setErr(null);
    try {
      const r = await call<{ message: Msg }>(`/api/reports/${reportId}/messages`, { body: { message: text } });
      load.set((x) => ({ messages: [...(x?.messages ?? list), r.message] }));
      setText(""); onSent();
    } catch (e) { setErr(e as ApiError); }
  };
  return (
    <div className="card" data-testid="report-messages">
      <h2>Messages about this report</h2>
      {list.length ? list.map((m) => (
        <div key={m.id} className={"bubble" + (m.senderId === me?.id ? " mine" : "")} style={{ maxWidth: "100%" }}>
          <div className="who">{m.senderName}{m.kind === "ask_fix" ? " · asked to fix" : m.kind === "admin_edit" ? " · correction" : ""}</div>
          <div>{m.message}</div>
          <div className="row between"><Listen text={m.message} /><span className="when">{fmtWhen(m.at)}</span></div>
        </div>
      )) : <Empty title="No messages yet" />}
      {canWrite && (
        <>
          <TextArea label="Write a message" value={text} onChange={setText} rows={2} testId="report-message" />
          {err && <ErrorNote error={err} />}
          <Button onClick={send} busyText="Sending…" disabled={!text.trim()} testId="report-message-send">Send</Button>
        </>
      )}
      <p className="tiny muted">New messages show here by themselves while this is open.</p>
    </div>
  );
}
