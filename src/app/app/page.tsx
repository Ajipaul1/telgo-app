"use client";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Loaded, Pill, Empty, Button } from "@/components/ui";
import { SignOutCard } from "@/components/SignInOut";
import { useLoad, useNow } from "@/lib/client/hooks";
import { ago, firstName, fmtDay, fmtDayLong, fmtTime, greeting, istToday, metres, distanceWords } from "@/lib/shared/format";
import { STATUS_WORDS, statusTone, type ReportStatus } from "@/lib/shared/report";
import { ROLE_LABEL, type Role } from "@/lib/shared/roles";
import type { Shift } from "@/lib/shared/attendance";

type ReportItem = { id: string; reportDate: string; projectName: string | null; projectId: string; supervisorName: string; supervisorId: string; status: ReportStatus; createdAt: string };

function Hero({ sub }: { sub?: string }) {
  const { me } = useApp();
  return (
    <div className="card hero pad-lg">
      <span className="eyebrow" style={{ color: "#8fe8f2" }}>{fmtDayLong(istToday())}</span>
      <h1>{greeting()}, {firstName(me?.fullName)}</h1>
      {sub && <p className="muted">{sub}</p>}
    </div>
  );
}

export default function Home() {
  const { me } = useApp();
  if (!me) return null;
  if (me.role === "admin") return <AdminHome />;
  if (me.role === "client") return <ClientHome />;
  return <StaffHome />;
}

// ---------------- admin ----------------
type AdminHomeData = {
  today: string; yesterday: string;
  people: { id: string; fullName: string; role: Role; firstInAt: string | null; now: { state: Shift["state"]; projectName: string; inAt: string; outAt: string | null; within: boolean | null; distanceM: number | null } | null; lastSeenAt: string | null }[];
  reportsYesterday: { sent: ReportItem[]; missing: { id: string; fullName: string }[] };
  reportsToday: ReportItem[];
  waiting: number; askedToFix: number; accessRequests: number;
};

function AdminHome() {
  const { counts } = useApp();
  const load = useLoad<AdminHomeData>("/api/home", { every: 30 });
  const now = useNow();
  return (
    <Screen title="Home" testId="home-admin">
      <Hero sub="Who is working today, and what is waiting for you." />
      <Loaded load={load}>
        {(d) => {
          const working = d.people.filter((p) => p.now?.state === "open");
          const done = d.people.filter((p) => p.now && p.now.state !== "open");
          const notIn = d.people.filter((p) => !p.now);
          return (
            <>
              <div className="grid2">
                <a className="stat spark" href="/app/reports/review"><b>{d.waiting}</b><span>Reports to review</span></a>
                <a className={"stat" + (d.askedToFix ? " bad" : "")} href="/app/reports/fix"><b>{d.askedToFix}</b><span>Asked to fix</span></a>
                <a className="stat" href="/app/inventory/approvals"><b>{counts.approvals ?? 0}</b><span>Inventory to approve</span></a>
                <a className="stat" href="/app/team/requests"><b>{d.accessRequests}</b><span>Access requests</span></a>
              </div>

              <div className="section-title">Working now ({working.length})</div>
              {working.length ? (
                <div className="list" data-testid="working-now">
                  {working.map((p) => (
                    <a key={p.id} className="item" href={`/app/team/live?person=${p.id}`}>
                      <div className="grow">
                        <div className="title">{p.fullName}</div>
                        <div className="sub">{p.now!.projectName} · in since {fmtTime(p.firstInAt ?? p.now!.inAt)}</div>
                        <div className="sub tiny">{p.lastSeenAt ? `Phone last seen ${ago(p.lastSeenAt, now)}` : "No location since sign-in"}</div>
                      </div>
                      <div className="end">{p.now!.within === null ? <Pill>Site not on map</Pill> : p.now!.within ? <Pill tone="ok">At site</Pill> : <Pill tone="bad">{distanceWords(p.now!.distanceM)} away</Pill>}</div>
                    </a>
                  ))}
                </div>
              ) : <Empty title="Nobody is signed in right now" />}

              {done.length > 0 && (
                <>
                  <div className="section-title">Signed out today ({done.length})</div>
                  <div className="list">
                    {done.map((p) => (
                      <div key={p.id} className="item">
                        <div className="grow"><div className="title">{p.fullName}</div><div className="sub">{p.now!.projectName} · {fmtTime(p.firstInAt)} – {fmtTime(p.now!.outAt)}</div></div>
                        <Pill>{p.now!.state === "not_signed_out" ? "Didn't sign out" : "Signed out"}</Pill>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {notIn.length > 0 && (
                <div className="card">
                  <div className="card-title"><h3>Not signed in today ({notIn.length})</h3></div>
                  <p className="small muted">{notIn.map((p) => `${p.fullName} (${ROLE_LABEL[p.role]})`).join(", ")}</p>
                </div>
              )}

              <div className="section-title">Yesterday&apos;s reports · {fmtDay(d.yesterday)}</div>
              <div className="card" data-testid="yesterday-reports">
                <div className="row between"><b>{d.reportsYesterday.sent.length} sent</b>{d.reportsYesterday.missing.length > 0 && <Pill tone="bad">{d.reportsYesterday.missing.length} missing</Pill>}</div>
                {d.reportsYesterday.sent.length > 0 && (
                  <div className="list" style={{ boxShadow: "none" }}>
                    {d.reportsYesterday.sent.map((r) => (
                      <a key={r.id} className="item" href={`/app/reports/view/${r.id}`}>
                        <div className="grow"><div className="title">{r.supervisorName}</div><div className="sub">{r.projectName ?? `Unknown project (${r.projectId})`} · sent {fmtTime(r.createdAt)}</div></div>
                        <Pill tone={statusTone(r.status)}>{STATUS_WORDS[r.status]}</Pill>
                      </a>
                    ))}
                  </div>
                )}
                {d.reportsYesterday.missing.length > 0 && <p className="small"><b>No report from:</b> {d.reportsYesterday.missing.map((m) => m.fullName).join(", ")}</p>}
              </div>

              <div className="section-title">Today&apos;s reports so far</div>
              {d.reportsToday.length ? (
                <div className="list">
                  {d.reportsToday.map((r) => (
                    <a key={r.id} className="item" href={`/app/reports/view/${r.id}`}>
                      <div className="grow"><div className="title">{r.supervisorName}</div><div className="sub">{r.projectName ?? r.projectId} · {fmtTime(r.createdAt)}</div></div>
                      <Pill tone={statusTone(r.status)}>{STATUS_WORDS[r.status]}</Pill>
                    </a>
                  ))}
                </div>
              ) : <Empty title="No report for today yet" />}
              <Button kind="ghost" block href="/app/team/live">Open the live map</Button>
            </>
          );
        }}
      </Loaded>
    </Screen>
  );
}

// ---------------- site staff and accounts ----------------
type StaffHomeData = { open: Shift | null; reports: ReportItem[]; reportToday: ReportItem | null; toFix: ReportItem[] };

function StaffHome() {
  const { me, shift } = useApp();
  const field = me?.role === "supervisor" || me?.role === "engineer";
  const load = useLoad<StaffHomeData>("/api/home", { every: 45 });
  return (
    <Screen title="Home" testId="home-staff">
      <Hero />
      {shift.open && <SignOutCard open={shift.open} />}
      {field && (
        <Loaded load={load} skeleton={1}>
          {(d) => (
            <>
              {d.reportToday ? (
                <a className="card line-ok" href={`/app/my-reports/${d.reportToday.id}`} data-testid="report-today">
                  <div className="row between"><h2>Today&apos;s report</h2><Pill tone={statusTone(d.reportToday.status)}>{STATUS_WORDS[d.reportToday.status]}</Pill></div>
                  <p className="muted small">Sent at {fmtTime(d.reportToday.createdAt)} for {d.reportToday.projectName}.</p>
                </a>
              ) : (
                <div className="card line-warn">
                  <h2>Today&apos;s report</h2>
                  <p className="muted small">Not sent yet. Send it before you sign out.</p>
                  <Button big block href="/app/report/new" testId="send-report-shortcut">Send daily report</Button>
                </div>
              )}
              {d.toFix.length > 0 && (
                <>
                  <div className="section-title">Asked to fix</div>
                  <div className="list">
                    {d.toFix.map((r) => (
                      <a key={r.id} className="item" href={`/app/my-reports/${r.id}`}>
                        <div className="grow"><div className="title">{fmtDay(r.reportDate)} · {r.projectName}</div><div className="sub">The admin asked you to fix something.</div></div>
                        <Pill tone="bad">Fix it</Pill>
                      </a>
                    ))}
                  </div>
                </>
              )}
              <div className="section-title">This week</div>
              {d.reports.length ? (
                <div className="list">
                  {d.reports.map((r) => (
                    <a key={r.id} className="item" href={`/app/my-reports/${r.id}`}>
                      <div className="grow"><div className="title">{fmtDay(r.reportDate)}</div><div className="sub">{r.projectName ?? r.projectId}</div></div>
                      <Pill tone={statusTone(r.status)}>{STATUS_WORDS[r.status]}</Pill>
                    </a>
                  ))}
                </div>
              ) : <Empty title="No reports this week yet" />}
            </>
          )}
        </Loaded>
      )}
      {!field && (
        <div className="grid2">
          <a className="stat" href="/app/reports/saved"><b>Reports</b><span>Saved (approved) reports</span></a>
          <a className="stat" href="/app/reports/totals"><b>Totals</b><span>Money and work, day by day</span></a>
        </div>
      )}
      <div className="card">
        <h3>How the day goes</h3>
        <ol className="small muted" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>Sign in when you reach the site (the app reads your location once).</li>
          {field && <li>Send the daily report: crew, expenses with bills, work done with photos.</li>}
          {field && <li>Add materials to Inventory; report when they move or are used.</li>}
          <li>Sign out when you leave. After 12 hours the app signs you out by itself.</li>
        </ol>
      </div>
    </Screen>
  );
}

// ---------------- client ----------------
type ClientProject = { id: string; name: string; district: string | null; totalLengthKm: number | null; totals: { cableLayingM: number; trenchingM: number; hddM: number; reports: number; lastDay: string | null } };

function ClientHome() {
  const load = useLoad<{ projects: ClientProject[] }>("/api/home", { every: 120 });
  return (
    <Screen title="Home" testId="home-client">
      <Hero sub="Progress on your projects, from the approved site reports." />
      <Loaded load={load} isEmpty={(d) => !d.projects.length} empty={<Empty title="No project has been shared with you yet">The Telgo admin shares projects with your login.</Empty>}>
        {(d) => (
          <div className="stack">
            {d.projects.map((p) => (
              <a key={p.id} className="card" href={`/app/projects/${p.id}`}>
                <h2>{p.name}</h2>
                <dl className="kv">
                  <dt>Cable laid</dt><dd>{metres(p.totals.cableLayingM)}{p.totalLengthKm ? ` of ${p.totalLengthKm} km` : ""}</dd>
                  <dt>Trenching</dt><dd>{metres(p.totals.trenchingM)}</dd>
                  <dt>HDD</dt><dd>{metres(p.totals.hddM)}</dd>
                  <dt>Approved reports</dt><dd>{p.totals.reports}</dd>
                  <dt>Last work day</dt><dd>{fmtDay(p.totals.lastDay)}</dd>
                </dl>
              </a>
            ))}
          </div>
        )}
      </Loaded>
    </Screen>
  );
}
