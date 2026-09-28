"use client";
// My attendance (site staff and accounts): this month at a glance, then every shift of the last 45 days by day.
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Empty, Loaded, Pill } from "@/components/ui";
import { useLoad, useNow } from "@/lib/client/hooks";
import type { Shift } from "@/lib/shared/attendance";
import type { Role } from "@/lib/shared/roles";
import { distanceWords, duration, fmtDateTime, fmtDay, fmtTime, istDate, istToday } from "@/lib/shared/format";

type Data = { open: Shift | null; shifts: Shift[] };
const ROLES: Role[] = ["supervisor", "engineer", "finance"];

const hm = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h} h ${m % 60} min` : `${m} min`;
};

// time worked: a closed shift from sign-in to sign-out, an open one until now; a shift nobody signed out of has no end, so it adds nothing
const worked = (s: Shift, now: number) =>
  s.state === "closed" && s.outAt ? Math.max(0, Date.parse(s.outAt) - Date.parse(s.inAt))
    : s.state === "open" ? Math.max(0, now - Date.parse(s.inAt)) : 0;

function endedWords(s: Shift): { text: string; tone?: "bad" | "warn" | "ok" } {
  if (s.state === "open") return { text: "At work now", tone: "ok" };
  if (s.state === "not_signed_out") return { text: "Didn't sign out", tone: "bad" };
  if (s.closedHow === "auto_12h") return { text: "Signed out by the app after 12 hours", tone: "warn" };
  if (s.closedHow === "signed_out_no_location") return { text: "Signed out without location" };
  if (s.outDistanceM !== null) return { text: `Signed out ${distanceWords(s.outDistanceM)} from the site` };
  return { text: "Signed out" };
}

function signInWords(s: Shift) {
  if (s.inDistanceM === null) return "Sign-in: distance not known";
  return `Signed in ${distanceWords(s.inDistanceM)} from the site${s.inWithin === null ? "" : s.inWithin ? " (at the site)" : " (outside the site area)"}`;
}

const edge = (s: Shift) =>
  s.state === "open" ? " line-ok" : s.state === "not_signed_out" ? " line-bad" : s.closedHow === "auto_12h" ? " line-warn" : "";

export default function MyAttendancePage() {
  const { me } = useApp();
  const load = useLoad<Data>(me && ROLES.includes(me.role) ? "/api/attendance/me" : null, { every: 60 });
  const now = useNow(30000);
  return (
    <Screen title="My attendance" roles={ROLES} testId="my-attendance">
      <Loaded load={load} isEmpty={(d) => !d.shifts.length}
        empty={<Empty title="No attendance yet">Your sign-ins and sign-outs show here.</Empty>}>
        {(d) => <History shifts={d.shifts} now={now} />}
      </Loaded>
    </Screen>
  );
}

function History({ shifts, now }: { shifts: Shift[]; now: number }) {
  const month = istToday().slice(0, 7);
  const monthName = new Date(`${month}-15T12:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "long", year: "numeric" });
  const inMonth = shifts.filter((s) => s.day.startsWith(month));
  const days = new Set(inMonth.map((s) => s.day)).size;
  const hours = inMonth.reduce((a, s) => a + worked(s, now), 0);
  const notOut = new Set(inMonth.filter((s) => s.state === "not_signed_out").map((s) => s.day)).size;
  const auto = inMonth.filter((s) => s.state === "closed" && s.closedHow === "auto_12h").length;
  const openNow = inMonth.some((s) => s.state === "open");

  // grouped by the India day of the sign-in, newest first (the list comes newest first)
  const byDay: [string, Shift[]][] = [];
  for (const s of shifts) {
    const g = byDay[byDay.length - 1];
    if (g && g[0] === s.day) g[1].push(s); else byDay.push([s.day, [s]]);
  }

  return (
    <>
      <div className="section-title" style={{ marginTop: 0 }}>This month · {monthName}</div>
      <div className="grid2" data-testid="attendance-summary">
        <div className="stat"><b data-testid="stat-days">{days}</b><span>Days worked this month</span></div>
        <div className="stat"><b data-testid="stat-hours">{hm(hours)}</b><span>Hours this month{openNow ? " (with today so far)" : ""}</span></div>
        <div className="stat"><b data-testid="stat-shifts">{inMonth.length}</b><span>Shifts this month</span></div>
        <div className={"stat" + (notOut ? " bad" : "")}><b data-testid="stat-not-out">{notOut}</b><span>Days not signed out</span></div>
      </div>
      {(auto > 0 || notOut > 0) && (
        <p className="tiny muted" style={{ margin: "0 4px" }}>
          {auto > 0 && `The hours include ${auto} ${auto === 1 ? "shift" : "shifts"} the app closed 12 hours after sign-in. `}
          {notOut > 0 && "A shift you didn't sign out of adds no hours: its end time isn't known."}
        </p>
      )}
      <p className="tiny muted" style={{ margin: "0 4px" }}>Showing the last 45 days.</p>

      <div className="stack loose" data-testid="attendance-days">
        {byDay.map(([day, list]) => {
          const total = list.reduce((a, s) => a + worked(s, now), 0);
          return (
            <section key={day} className="stack" data-testid="attendance-day">
              <div className="row between" style={{ margin: "0 4px" }}>
                <h3>{fmtDay(day)}</h3>
                <span className="small muted">{total ? hm(total) : ""}</span>
              </div>
              {list.map((s) => {
                const end = endedWords(s);
                const out = s.outAt ? (istDate(s.outAt) !== s.day ? fmtDateTime(s.outAt) : fmtTime(s.outAt)) : s.state === "open" ? "still signed in" : "no sign-out";
                return (
                  <div key={s.id} className={"card" + edge(s)} data-testid="attendance-shift">
                    <div className="row between" style={{ alignItems: "flex-start" }}>
                      <div className="grow">
                        <div className="strong" style={{ overflowWrap: "anywhere" }}>{s.projectName || "Site not recorded"}</div>
                        <div className="small">{fmtTime(s.inAt)} – {out}</div>
                      </div>
                      <div style={{ textAlign: "right", flex: "none" }}>
                        <div className="strong">{s.state === "closed" ? duration(s.inAt, s.outAt) : s.state === "open" ? duration(s.inAt, null, now) : "—"}</div>
                        <div className="tiny muted">{s.state === "open" ? "so far" : s.state === "closed" ? "worked" : "not known"}</div>
                      </div>
                    </div>
                    <div className="row wrap" style={{ gap: 6 }}>
                      <span className={"small" + (end.tone ? " strong" : " muted")} style={end.tone ? { color: `var(--${end.tone})` } : undefined} data-testid="shift-ended">{end.text}</span>
                      {s.fromOldApp && <Pill>Recorded by the old app</Pill>}
                    </div>
                    <div className="small muted">{signInWords(s)}</div>
                    {s.note && <div className="small" style={{ overflowWrap: "anywhere" }}><b>Note:</b> {s.note}</div>}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}
