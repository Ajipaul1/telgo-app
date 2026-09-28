"use client";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { SignInCard, SignOutCard, whereWords } from "@/components/SignInOut";
import { Loaded, Empty, Button, Pill } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import { duration, fmtTime, istToday } from "@/lib/shared/format";
import type { Shift } from "@/lib/shared/attendance";

export default function AttendancePage() {
  const { shift } = useApp();
  const load = useLoad<{ open: Shift | null; shifts: Shift[] }>("/api/attendance/me", { every: 60 });
  return (
    <Screen title="Sign in / out" roles={["supervisor", "engineer", "finance"]} testId="attendance">
      {shift.open ? <SignOutCard open={shift.open} onDone={() => load.reload()} /> : <SignInCard onDone={() => load.reload()} />}
      <div className="section-title">Today</div>
      <Loaded load={load} isEmpty={(d) => !d.shifts.some((s) => s.day === istToday())} empty={<Empty title="No sign-in yet today" />}>
        {(d) => (
          <div className="list">
            {d.shifts.filter((s) => s.day === istToday()).map((s) => (
              <div key={s.id} className="item">
                <div className="grow">
                  <div className="title">{s.projectName}</div>
                  <div className="sub">{fmtTime(s.inAt)} – {s.outAt ? fmtTime(s.outAt) : "now"} · {duration(s.inAt, s.outAt)}</div>
                  <div className="sub tiny">{whereWords(s)}</div>
                </div>
                <Pill tone={s.state === "open" ? "ok" : undefined}>{s.state === "open" ? "Signed in" : s.closedHow === "auto_12h" ? "Closed after 12 h" : "Signed out"}</Pill>
              </div>
            ))}
          </div>
        )}
      </Loaded>
      <Button kind="ghost" block href="/app/attendance/history">My attendance</Button>
    </Screen>
  );
}
