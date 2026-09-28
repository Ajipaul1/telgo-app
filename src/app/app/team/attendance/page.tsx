"use client";
import { Suspense, useEffect, useId, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Button, Choice, Empty, Field, Loaded, Pill, Select } from "@/components/ui";
import { useLoad, useNow } from "@/lib/client/hooks";
import { addDays, distanceWords, duration, fmtDay, fmtTime, istToday, numIN } from "@/lib/shared/format";
import type { Shift } from "@/lib/shared/attendance";
import { roleLabel } from "../_parts/parts";

type Data = { from: string; to: string; shifts: Shift[]; people: { id: string; fullName: string; role: string }[] };
type Mode = "day" | "month";

const hoursOf = (s: Shift) => (s.outAt ? Math.max(0, Date.parse(s.outAt) - Date.parse(s.inAt)) / 3600e3 : null);

function hoursWords(h: number) {
  const m = Math.round(h * 60);
  const hh = Math.floor(m / 60);
  return hh ? `${hh} h ${m % 60} min` : `${m} min`;
}

// how the shift ended, in words
function endedWords(s: Shift) {
  if (s.fromOldApp) return `Recorded by the old app (${s.marks === 1 ? "1 mark" : `${s.marks} marks`} grouped)`;
  if (s.closedHow === "auto_12h") return "Signed out by the app after 12 hours";
  if (s.closedHow === "signed_out_no_location") return "Signed out without location";
  if (s.state === "open") return "Still signed in";
  if (s.state === "not_signed_out" || s.closedHow === "not_signed_out") return "Didn't sign out";
  if (s.closedHow === "signed_out" || s.outAt) return "Signed out";
  return "not recorded";
}

function distanceAtSignIn(s: Shift) {
  if (s.inDistanceM === null || s.inDistanceM === undefined) return "distance not known";
  if (s.inWithin) return `At site (${distanceWords(s.inDistanceM)} from the site point)`;
  return `${distanceWords(s.inDistanceM)} from the site`;
}

const csvCell = (v: string | number | null | undefined) => {
  const t = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

function downloadCsv(d: Data) {
  const head = ["Day", "Name", "Role", "Site", "In", "Out", "Hours", "How it ended", "Distance at sign-in (m)"];
  const lines = [head.map(csvCell).join(",")];
  for (const s of [...d.shifts].sort((a, b) => Date.parse(a.inAt) - Date.parse(b.inAt))) {
    const h = hoursOf(s);
    lines.push([
      s.day, s.userName, roleLabel(s.role), s.projectName, fmtTime(s.inAt), s.outAt ? fmtTime(s.outAt) : "",
      h === null ? "" : h.toFixed(2), endedWords(s), s.inDistanceM === null ? "" : Math.round(s.inDistanceM),
    ].map(csvCell).join(","));
  }
  const blob = new Blob(["﻿" + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = d.from === d.to ? `telgo-attendance-${d.from}.csv` : `telgo-attendance-${d.from}-to-${d.to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function AttendancePage() {
  return (
    <Screen title="Attendance" roles={["admin"]} testId="team-attendance">
      <Suspense fallback={<div className="skeleton" />}>
        <AttendanceBody />
      </Suspense>
    </Screen>
  );
}

function AttendanceBody() {
  const sp = useSearchParams();
  const { toast } = useApp();
  const now = useNow();
  const today = istToday();
  const dayId = useId();
  const [mode, setMode] = useState<Mode>("day");
  const [day, setDay] = useState(today);
  const [user, setUser] = useState<string>(() => sp.get("user") ?? "");
  const [people, setPeople] = useState<Data["people"]>([]);

  const from = mode === "month" ? today.slice(0, 8) + "01" : day;
  const to = mode === "month" ? today : day;
  const path = `/api/team/attendance?from=${from}&to=${to}${user ? `&user=${encodeURIComponent(user)}` : ""}`;
  const load = useLoad<Data>(path, { every: to >= today ? 30 : 0 });

  // keep the person list while another day loads, so the filter never disappears under the finger
  useEffect(() => { if (load.data?.people) setPeople(load.data.people); }, [load.data]);

  const options = useMemo(() => {
    const list = [{ value: "", label: "Everyone" }, ...people.map((p) => ({ value: p.id, label: `${p.fullName} (${roleLabel(p.role)})` }))];
    if (user && !people.some((p) => p.id === user)) {
      const name = load.data?.shifts.find((s) => s.userId === user)?.userName;
      list.push({ value: user, label: name ? `${name} (not in the active team now)` : "The chosen person (not in the active team now)" });
    }
    return list;
  }, [people, user, load.data]);

  return (
    <>
      <div className="card" data-testid="att-controls">
        <Choice value={mode} onChange={setMode} options={[{ value: "day", label: "One day" }, { value: "month", label: "This month" }]} testId="att-mode" />
        {mode === "day" ? (
          <>
            <Field label="Day" htmlFor={dayId}>
              <input id={dayId} className="input" type="date" value={day} max={today} data-testid="att-day"
                onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) setDay(e.target.value); }} />
            </Field>
            <div className="btn-row">
              <Button kind="soft" onClick={() => setDay((d) => addDays(d, -1))} testId="att-prev">Previous day</Button>
              <Button kind="soft" onClick={() => setDay((d) => (d < today ? addDays(d, 1) : d))} disabled={day >= today} testId="att-next">Next day</Button>
            </div>
            {day !== today && <button type="button" className="link-btn" onClick={() => setDay(today)} style={{ alignSelf: "flex-start" }}>Back to today</button>}
          </>
        ) : <p className="small muted">From {fmtDay(from)} to {fmtDay(to)} (today).</p>}
        <Select label="Person" value={user} onChange={setUser} options={options} testId="att-person" />
      </div>

      <Loaded load={load} isEmpty={(d) => !d.shifts.length}
        empty={<Empty title={
          user ? (mode === "month" ? "No sign-ins this month for this person" : day === today ? "No sign-in today for this person" : `No sign-in on ${fmtDay(day)} for this person`)
            : mode === "month" ? "No one signed in this month" : day === today ? "No one has signed in today" : `No one signed in on ${fmtDay(day)}`} />}>
        {(d) => {
          const finished = d.shifts.map(hoursOf).filter((h): h is number => h !== null);
          const total = finished.reduce((a, b) => a + b, 0);
          const stillIn = d.shifts.filter((s) => s.state === "open").length;
          const days = [...new Set(d.shifts.map((s) => s.day))].sort((a, b) => (a < b ? 1 : -1));
          return (
            <>
              <div className="grid2" data-testid="att-summary">
                <div className="stat"><b>{new Set(d.shifts.map((s) => s.userId)).size}</b><span>People signed in</span></div>
                <div className="stat"><b>{d.shifts.length}</b><span>Shifts</span></div>
                <div className="stat"><b>{hoursWords(total)}</b><span>Worked ({finished.length === 1 ? "1 finished shift" : `${finished.length} finished shifts`})</span></div>
                <div className={"stat" + (stillIn ? " ok" : "")}><b>{stillIn}</b><span>Still signed in now</span></div>
              </div>
              <Button kind="ghost" block onClick={() => { downloadCsv(d); toast(`CSV made from ${d.shifts.length} shifts`); }} testId="att-csv">Download CSV</Button>
              <div className="stack" data-testid="att-list">
                {days.map((dy) => {
                  const list = d.shifts.filter((s) => s.day === dy);
                  return (
                    <div key={dy} className="stack tight">
                      <div className="section-title">{fmtDay(dy)} · {list.length === 1 ? "1 shift" : `${list.length} shifts`}</div>
                      <div className="list">
                        {list.map((s) => {
                          const h = hoursOf(s);
                          return (
                            <a key={s.id} className="item" href={`/app/team/live?person=${s.userId}&day=${s.day}`} data-testid="att-shift">
                              <div className="grow">
                                <div className="title ellipsis">{s.userName || "Name not recorded"}</div>
                                <div className="sub ellipsis">{s.projectName || "Site not recorded"} · {roleLabel(s.role)}</div>
                                <div className="sub">
                                  in {fmtTime(s.inAt)} – {s.outAt ? `out ${fmtTime(s.outAt)}` : s.state === "open" ? "still signed in" : "didn't sign out"}
                                  {" · "}{h !== null ? hoursWords(h) : s.state === "open" ? `${duration(s.inAt, null, now)} so far` : "hours not known"}
                                </div>
                                <div className="sub tiny">{s.state === "open" ? "" : `${endedWords(s)} · `}{s.state === "open" ? distanceAtSignIn(s).replace(/^./, (c) => c.toUpperCase()) : distanceAtSignIn(s)}</div>
                              </div>
                              <div className="end">
                                {s.state === "open" ? <Pill tone="ok">In</Pill> : !s.outAt ? <Pill tone="warn">No sign-out</Pill> : <Pill>Out</Pill>}
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="tiny muted center">Hours count only finished shifts (sign-in to sign-out). {numIN(total, 2)} hours in all.</p>
            </>
          );
        }}
      </Loaded>
    </>
  );
}
