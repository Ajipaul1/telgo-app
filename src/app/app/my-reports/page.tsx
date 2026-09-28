"use client";
// My reports (site staff): the ones the admin asked to fix first, then all the others, newest first.
import Link from "next/link";
import { Screen } from "@/components/Screen";
import { useApp } from "@/components/AppContext";
import { Button, Empty, Loaded, Pill } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import { fmtDay, fmtWhen, metres, numIN } from "@/lib/shared/format";
import { STATUS_WORDS, statusTone, type ReportView, type Summary } from "@/lib/shared/report";
import type { Role } from "@/lib/shared/roles";

type Item = Omit<ReportView, "body">;
const ROLES: Role[] = ["supervisor", "engineer"];

const WORK_SHORT: [keyof Summary, string, "m" | "count"][] = [
  ["trenching", "Trenching", "m"], ["hdd", "HDD", "m"], ["cableLaying", "Cable laid", "m"], ["cableMounting", "Cable mounted", "m"],
  ["joints", "Joints", "count"], ["rmu", "RMU foundations", "count"], ["terminations", "Terminations", "count"],
];

function summaryLine(s: Summary) {
  const parts = [`${numIN(s.workers, 0)} ${s.workers === 1 ? "worker" : "workers"}`];
  for (const [k, label, unit] of WORK_SHORT) {
    const v = Number(s[k]) || 0;
    if (v > 0) parts.push(`${label} ${unit === "m" ? metres(v) : numIN(v, 0)}`);
  }
  if (parts.length === 1) parts.push("no work recorded");
  return parts.join(" · ");
}

export default function MyReportsPage() {
  const { me } = useApp();
  // another login never asks for these (the screen says it isn't theirs; the server refuses anyway)
  const load = useLoad<{ reports: Item[] }>(me && ROLES.includes(me.role) ? "/api/reports/mine" : null, { every: 30 });
  return (
    <Screen title="My reports" roles={ROLES} testId="my-reports">
      <Button big block href="/app/report/new" testId="send-report">Send daily report</Button>
      <Loaded load={load} isEmpty={(d) => !d.reports.length}
        empty={<Empty title="You haven't sent a report yet">Send one each day from the site, before you sign out.</Empty>}>
        {(d) => {
          const fix = d.reports.filter((r) => r.status === "clarification");
          const rest = d.reports.filter((r) => r.status !== "clarification");
          return (
            <>
              {fix.length > 0 && (
                <>
                  <div className="section-title">Asked to fix ({fix.length})</div>
                  <p className="small muted" style={{ margin: "0 4px" }}>The admin asked you to fix {fix.length === 1 ? "this report" : "these reports"}. Open one to see what to change.</p>
                  <div className="stack" data-testid="reports-to-fix">
                    {fix.map((r) => <ReportCard key={r.id} r={r} line=" line-bad" />)}
                  </div>
                </>
              )}
              <div className="section-title">{fix.length ? "All other reports" : "Your reports"} ({rest.length})</div>
              {rest.length ? (
                <div className="stack" data-testid="reports-list">
                  {rest.map((r) => <ReportCard key={r.id} r={r} line={r.status === "approved" ? " line-ok" : ""} />)}
                </div>
              ) : <Empty title="No other reports" />}
            </>
          );
        }}
      </Loaded>
    </Screen>
  );
}

function ReportCard({ r, line }: { r: Item; line: string }) {
  const extra = [
    r.status === "approved" && r.approvedByName ? `approved by ${r.approvedByName}` : null,
    r.archivedAt ? "archived" : null,
    r.fromOldApp ? "sent from the old app" : null,
  ].filter(Boolean);
  return (
    <Link className={"card" + line} href={`/app/my-reports/${r.id}`} data-testid={`report-${r.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="grow">
          <h3>{fmtDay(r.reportDate)}</h3>
          <div className="small muted" style={{ overflowWrap: "anywhere" }}>{r.projectName ?? `Unknown project (${r.projectId})`}</div>
        </div>
        <Pill tone={statusTone(r.status)}>{STATUS_WORDS[r.status]}</Pill>
      </div>
      <div className="small">{summaryLine(r.summary)}</div>
      <div className="tiny muted">Sent {fmtWhen(r.createdAt)}{extra.length ? ` · ${extra.join(" · ")}` : ""}</div>
    </Link>
  );
}
