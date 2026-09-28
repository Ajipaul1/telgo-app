"use client";
import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Button, ErrorNote, Loaded, Select, Empty } from "@/components/ui";
import { useDraft, useLoad } from "@/lib/client/hooks";
import { call, newRef, ApiError } from "@/lib/client/api";
import { addDays, fmtDay, fmtTime, istToday, money, metres, numIN } from "@/lib/shared/format";
import { emptyBody, fileIdsOf, summarize, EXPENSE_CATEGORIES, EXPENSE_LABEL, type ReportBody, type ReportView } from "@/lib/shared/report";
import type { ProjectView } from "@/lib/shared/project";
import { CrewStep, ExpensesStep, MoreStep, WorkStep } from "./_parts/steps";

type Draft = { projectId: string; reportDate: string; body: ReportBody; ref: string; step: number };
// the order the day is done (owner's ask, 28 Sep 2026); the director sees the report in the same order
const STEPS = ["Site and day", "Work done today", "Workers and wages", "Expenses, then send"];

function Wizard() {
  const q = useSearchParams();
  const editId = q.get("edit");
  const { me } = useApp();
  const projects = useLoad<{ projects: ProjectView[] }>("/api/projects");
  const editing = useLoad<{ report: ReportView; canFix: boolean }>(editId ? `/api/reports/${editId}` : null);
  if (editId) {
    return (
      <Loaded load={editing}>
        {(d) => d.canFix ? <Form key={d.report.id} projects={projects.data?.projects ?? []} fix={d.report} /> : <Empty title="This report can't be changed">It is approved and locked. Ask the admin if something is wrong.</Empty>}
      </Loaded>
    );
  }
  return (
    <Loaded load={projects} isEmpty={(d) => !d.projects.length} empty={<Empty title="No projects yet">The admin adds projects before reports can be sent.</Empty>}>
      {(d) => <Form projects={d.projects} draftKey={`telgo_report_draft_v2_${me?.id}`} />}
    </Loaded>
  );
}

function Form({ projects, fix, draftKey }: { projects: ProjectView[]; fix?: ReportView; draftKey?: string }) {
  const router = useRouter();
  const { toast, refreshCounts } = useApp();
  const initial = (): Draft => fix
    ? { projectId: fix.projectId, reportDate: fix.reportDate, body: fix.body, ref: newRef(), step: 1 }
    : { projectId: "", reportDate: istToday(), body: emptyBody(), ref: newRef(), step: 0 };
  const [d, setD, clearDraft] = useDraft<Draft>(fix ? `telgo_report_fix_${fix.id}` : draftKey ?? null, initial);
  const [err, setErr] = useState<ApiError | null>(null);
  const [sent, setSent] = useState<ReportView | null>(null);
  const mine = useLoad<{ reports: { id: string; reportDate: string; projectId: string; status: string }[] }>(fix ? null : "/api/reports/mine");
  const project = projects.find((p) => p.id === d.projectId) ?? null;

  // a new report starts with the project's standard wage (the supervisor can change it)
  useEffect(() => {
    if (fix || !project || d.body.crew.wageRate !== null || project.standardWage === null) return;
    setD((x) => ({ ...x, body: { ...x.body, crew: { ...x.body.crew, wageRate: project.standardWage } } }));
  }, [project, fix, d.body.crew.wageRate, setD]);

  const set = (fn: (b: ReportBody) => ReportBody) => setD((x) => ({ ...x, body: fn(x.body) }));
  const go = (step: number) => { setD((x) => ({ ...x, step })); window.scrollTo(0, 0); };
  const s = useMemo(() => summarize(d.body), [d.body]);
  const sameDay = mine.data?.reports.find((r) => r.projectId === d.projectId && r.reportDate === d.reportDate);
  const warnings: string[] = [];
  if (d.body.crew.workers > 0 && !d.body.crew.wageRate) warnings.push("Workers are entered but no daily wage.");
  if (d.body.expenses.some((e) => !e.bill)) warnings.push(`${d.body.expenses.filter((e) => !e.bill).length} expense line(s) have no bill photo.`);
  if (d.body.work.some((w) => !w.photos.length)) warnings.push("Some work has no photo.");
  if (d.body.work.some((w) => !w.value) && d.body.work.some((w) => w.key !== "hdd" || !d.body.hdd?.rods.length)) warnings.push("Some work has no amount (metres or count).");

  const send = async () => {
    setErr(null);
    // where the report was sent from, only if the phone already allows location (no question asked)
    let sentFrom: ReportBody["sentFrom"] = null;
    try {
      const st = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
      if (st?.state === "granted") {
        sentFrom = await new Promise((ok) => navigator.geolocation.getCurrentPosition((p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }), () => ok(null), { timeout: 5000, maximumAge: 60000 }));
      }
    } catch { /* no location: fine */ }
    const body = { ...d.body, sentFrom };
    try {
      const r = fix
        ? await call<{ report: ReportView }>(`/api/reports/${fix.id}`, { method: "PATCH", body: { expected: fix.updatedAt, body } })
        : await call<{ report: ReportView; repeat: boolean }>("/api/reports", { body: { ref: d.ref, projectId: d.projectId, reportDate: d.reportDate, body } });
      clearDraft();
      setSent(r.report);
      refreshCounts();
      toast(fix ? "The fixed report was sent back to the admin." : "Report sent.");
    } catch (e) {
      setErr(e as ApiError);
    }
  };

  if (sent) {
    return (
      <div className="stack loose" data-testid="report-sent">
        <div className="card hero pad-lg">
          <span className="eyebrow" style={{ color: "#8fe8f2" }}>{fix ? "Sent back for review" : "Report sent"}</span>
          <h1>Sent at {fmtTime(sent.createdAt === sent.updatedAt ? sent.createdAt : sent.updatedAt)}</h1>
          <p className="muted">The server saved it for {sent.projectName}, {fmtDay(sent.reportDate)}. The director reviews it; you get a notification when it is approved or needs fixing.</p>
        </div>
        <Button big block href={`/app/my-reports/${sent.id}`}>Open the report</Button>
        <Button kind="ghost" block href="/app">Home</Button>
      </div>
    );
  }

  const last = STEPS.length - 1;
  const canNext = d.step !== 0 || !!d.projectId;
  const dates = [0, 1, 2, 3].map((n) => addDays(istToday(), -n));
  return (
    <div className="stack loose" data-vm-editing="1">
      <div className="stack tight">
        <div className="steps" aria-hidden="true">{STEPS.map((_, i) => <span key={i} className={i <= d.step ? "done" : ""} />)}</div>
        <div className="row between"><span className="eyebrow">Step {d.step + 1} of {STEPS.length}</span><span className="small muted">{STEPS[d.step]}</span></div>
        <h1>{fix ? `Fix: ${STEPS[d.step]}` : STEPS[d.step]}</h1>
      </div>

      {d.step === 0 && (
        <div className="card">
          {fix ? (
            <p>{fix.projectName ?? fix.projectId} · {fmtDay(fix.reportDate)} <span className="muted small">(site and date can&apos;t change when fixing)</span></p>
          ) : (
            <>
              <Select label="Site" value={d.projectId} onChange={(v) => setD((x) => ({ ...x, projectId: v }))} placeholder="Choose the site" testId="report-project"
                options={projects.filter((p) => p.status !== "completed").map((p) => ({ value: p.id, label: p.name + (p.district ? ` · ${p.district}` : "") }))} />
              <Select label="Day" value={d.reportDate} onChange={(v) => setD((x) => ({ ...x, reportDate: v }))} testId="report-day"
                options={dates.map((x, i) => ({ value: x, label: i === 0 ? `Today, ${fmtDay(x)}` : i === 1 ? `Yesterday, ${fmtDay(x)}` : fmtDay(x) }))} />
              <p className="tiny muted">A report can be sent for today or the 3 days before.</p>
              {sameDay && <div className="notice warn"><b>You already sent a report for this site on this day</b><span>Open it to see or fix it, or carry on to send another one.</span><div><Button small kind="ghost" href={`/app/my-reports/${sameDay.id}`}>Open it</Button></div></div>}
            </>
          )}
        </div>
      )}
      {d.step === 1 && <WorkStep body={d.body} set={set} project={project} />}
      {d.step === 2 && <CrewStep body={d.body} set={set} project={project} />}
      {d.step === last && (
        <div className="stack loose" data-testid="report-check">
          <ExpensesStep body={d.body} set={set} />
          <MoreStep body={d.body} set={set} />
          <div className="section-title">What the director will see</div>
          <div className="card">
            <h2>{project?.name ?? fix?.projectName ?? "Site"} · {fmtDay(d.reportDate)}</h2>
            <dl className="kv">
              {s.trenching > 0 && <><dt>Trenching</dt><dd>{metres(s.trenching)}</dd></>}
              {s.hdd > 0 && <><dt>HDD</dt><dd>{metres(s.hdd)}</dd></>}
              {s.cableLaying > 0 && <><dt>Cable laying</dt><dd>{metres(s.cableLaying)}</dd></>}
              {s.cableMounting > 0 && <><dt>Cable mounting</dt><dd>{metres(s.cableMounting)}</dd></>}
              {s.joints > 0 && <><dt>Joints</dt><dd>{s.joints}</dd></>}
              {s.rmu > 0 && <><dt>RMU foundations</dt><dd>{s.rmu}</dd></>}
              {s.terminations > 0 && <><dt>Terminations</dt><dd>{s.terminations}</dd></>}
              {!d.body.work.length && <><dt>Work</dt><dd>none entered</dd></>}
              <dt>Workers</dt><dd>{s.workers}</dd>
              <dt>Wages</dt><dd>{money(s.wages)}</dd>
              {s.otHours > 0 && <><dt>Overtime</dt><dd>{numIN(s.otHours)} worker-hours</dd></>}
              {EXPENSE_CATEGORIES.filter((c) => s[c] > 0).map((c) => <Fragment key={c}><dt>{EXPENSE_LABEL[c]}</dt><dd>{money(s[c])}</dd></Fragment>)}
              <dt>Expenses</dt><dd>{money(s.expenses)}</dd>
              <dt><b>Total cost today</b></dt><dd><b data-testid="report-total">{money(s.wages + s.expenses)}</b></dd>
              <dt>Photos and bills</dt><dd>{fileIdsOf(d.body).length}</dd>
              {d.body.clearances.length > 0 && <><dt>Permissions</dt><dd>{d.body.clearances.length}</dd></>}
            </dl>
          </div>
          {warnings.length > 0 && <div className="notice warn"><b>Check before sending</b>{warnings.map((w) => <span key={w}>{w}</span>)}</div>}
          {err && <ErrorNote error={err} title="The report was not sent" />}
          {err && <p className="small muted">Everything you entered is kept on this phone. Send again when it is fixed or you have signal.</p>}
          <Button big block onClick={send} busyText="Sending…" testId="report-send">{fix ? "Send the fixed report to the director" : "Send to the director"}</Button>
        </div>
      )}

      <div className="wizard-foot">
        <Button kind="ghost" onClick={() => (d.step === 0 ? router.push("/app") : go(d.step - 1))}>{d.step === 0 ? "Cancel" : "Back"}</Button>
        {d.step < last && <Button onClick={() => go(d.step + 1)} disabled={!canNext} testId="report-next">Next: {STEPS[d.step + 1].split(",")[0]}</Button>}
      </div>
    </div>
  );
}

export default function NewReport() {
  return (
    <Screen title="Send daily report" roles={["supervisor", "engineer"]} testId="report-new">
      <Suspense><Wizard /></Suspense>
    </Screen>
  );
}
