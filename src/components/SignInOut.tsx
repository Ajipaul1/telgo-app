"use client";
import { useEffect, useRef, useState } from "react";
import { call, ApiError, newRef } from "@/lib/client/api";
import { getPosition } from "@/lib/client/device";
import { useLoad } from "@/lib/client/hooks";
import { distanceWords, duration, fmtTime, fmtWhen, istToday } from "@/lib/shared/format";
import type { Shift } from "@/lib/shared/attendance";
import { useApp } from "./AppContext";
import { Button, ErrorNote, Select, Sheet, TextArea } from "./ui";

type ProjectLite = { id: string; name: string; district: string | null; route: [number, number][] };
const LAST = "telgo_last_project";

export function whereWords(s: Pick<Shift, "inDistanceM" | "inWithin">, radius?: number) {
  if (s.inDistanceM === null) return "The project has no site on the map yet, so the distance isn't known.";
  return s.inWithin ? `${distanceWords(s.inDistanceM)} from the site: at the site.` : `${distanceWords(s.inDistanceM)} from the site: outside the site area${radius ? ` (${radius} m)` : ""}. The admin is told.`;
}

export function SignInCard({ onDone, compact }: { onDone?: (s: Shift) => void; compact?: boolean }) {
  const { shift, toast } = useApp();
  const projects = useLoad<{ projects: ProjectLite[] }>("/api/projects");
  const [projectId, setProjectId] = useState<string>("");
  const [step, setStep] = useState<"idle" | "gps" | "saving">("idle");
  const [err, setErr] = useState<ApiError | null>(null);
  const ref = useRef<string>(newRef());

  useEffect(() => {
    const list = projects.data?.projects ?? [];
    if (!list.length || projectId) return;
    let last: string | null = null;
    try { last = localStorage.getItem(LAST); } catch { /* none */ }
    setProjectId(list.find((p) => p.id === last)?.id ?? (list.length === 1 ? list[0].id : ""));
  }, [projects.data, projectId]);

  const signIn = async () => {
    setErr(null);
    if (!projectId) { setErr(new ApiError("Choose the site you are at.", "INVALID")); return; }
    try {
      setStep("gps");
      const fix = await getPosition({ timeoutMs: 15000 });
      setStep("saving");
      const r = await call<{ shift: Shift; siteRadiusM: number }>("/api/attendance/sign-in", { body: { projectId, lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, ref: ref.current } });
      try { localStorage.setItem(LAST, projectId); } catch { /* fine */ }
      ref.current = newRef();
      shift.set(r.shift);
      toast(`Signed in at ${fmtTime(r.shift.inAt)}.`);
      onDone?.(r.shift);
    } catch (e) {
      setErr(e instanceof ApiError ? e : new ApiError(String(e), "ERROR"));
      if ((e as ApiError).code === "ALREADY_IN") shift.reload();
    } finally {
      setStep("idle");
    }
  };

  const list = projects.data?.projects ?? [];
  return (
    <div className="card pad-lg" data-testid="sign-in-card">
      {!compact && <h2>Sign in at your site</h2>}
      {!compact && <p className="muted small">The app reads your phone&apos;s location once, measures how far you are from the site, and saves the time from the server.</p>}
      {projects.loading ? <div className="skeleton" /> : projects.error && !list.length ? <ErrorNote error={projects.error} onRetry={projects.reload} /> : !list.length ? (
        <div className="notice warn"><b>No projects yet</b><span>The admin has to add a project before anyone can sign in at it.</span></div>
      ) : (
        <Select label="Site" value={projectId} onChange={setProjectId} placeholder="Choose the site you are at" testId="sign-in-project"
          options={list.map((p) => ({ value: p.id, label: p.name + (p.district ? ` · ${p.district}` : "") }))} />
      )}
      {err && <ErrorNote error={err} />}
      <Button big block onClick={signIn} disabled={!list.length || step !== "idle"} testId="sign-in-button" busyText="Signing in…">
        {step === "gps" ? "Finding your location…" : step === "saving" ? "Signing in…" : "Sign in here"}
      </Button>
    </div>
  );
}

export function SignOutCard({ open, onDone }: { open: Shift; onDone?: (s: Shift) => void }) {
  const { shift, toast, me } = useApp();
  const [sheet, setSheet] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<ApiError | null>(null);
  const [gpsProblem, setGpsProblem] = useState<string | null>(null);
  const home = useLoad<{ reportToday: { id: string } | null }>(me?.role === "supervisor" || me?.role === "engineer" ? "/api/home" : null);
  const noReport = (me?.role === "supervisor" || me?.role === "engineer") && home.data && !home.data.reportToday;

  const signOut = async (withGps: boolean) => {
    setErr(null);
    let fix: { lat: number; lng: number; accuracy: number | null } | null = null;
    if (withGps) {
      try { fix = await getPosition({ timeoutMs: 10000 }); }
      catch (e) { setGpsProblem((e as Error).message); return; }
    }
    try {
      const r = await call<{ shift: Shift }>("/api/attendance/sign-out", { body: fix ? { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, note } : { note } });
      shift.set(null);
      setSheet(false);
      toast(`Signed out at ${fmtTime(r.shift.outAt)}${fix ? "" : " (without location)"}.`);
      onDone?.(r.shift);
    } catch (e) {
      setErr(e instanceof ApiError ? e : new ApiError(String(e), "ERROR"));
      if ((e as ApiError).code === "NOT_IN" || (e as ApiError).code === "CHANGED") shift.reload();
    }
  };

  return (
    <div className="card pad-lg line-ok" data-testid="sign-out-card">
      <div className="row between"><h2>You are signed in</h2><span className="pill ok">At work</span></div>
      <dl className="kv">
        <dt>Site</dt><dd>{open.projectName}</dd>
        <dt>Since</dt><dd>{fmtWhen(open.inAt)}</dd>
        <dt>For</dt><dd>{duration(open.inAt, null)}</dd>
      </dl>
      <p className="muted small">{whereWords(open)}</p>
      {open.day !== istToday() && <div className="notice warn">This shift started on another day. Sign out now; after 12 hours the app closes it by itself.</div>}
      <Button big block kind="danger" onClick={() => { setSheet(true); setGpsProblem(null); setErr(null); }} testId="sign-out-button">Sign out</Button>
      <Sheet open={sheet} onClose={() => setSheet(false)} label="Sign out">
        <h2>Sign out of {open.projectName}?</h2>
        {noReport && (
          <div className="notice warn"><b>Today&apos;s report isn&apos;t sent yet</b><span>The app works only while you are signed in. Send the report first.</span>
            <div><Button small href="/app/report/new">Send today&apos;s report</Button></div></div>
        )}
        <TextArea label="Note (if anything)" value={note} onChange={setNote} rows={2} placeholder="e.g. work stopped for rain" />
        {gpsProblem && (
          <div className="notice warn"><b>No location</b><span>{gpsProblem}</span>
            <span>You can still sign out: it is saved as &quot;signed out without location&quot;.</span>
            <div><Button small kind="ghost" onClick={() => signOut(false)} testId="sign-out-no-gps">Sign out without location</Button></div></div>
        )}
        {err && <ErrorNote error={err} />}
        <div className="btn-row">
          <Button kind="ghost" onClick={() => setSheet(false)}>Not now</Button>
          <Button kind="danger" onClick={() => signOut(true)} busyText="Signing out…" testId="sign-out-confirm">Sign out</Button>
        </div>
      </Sheet>
    </div>
  );
}
