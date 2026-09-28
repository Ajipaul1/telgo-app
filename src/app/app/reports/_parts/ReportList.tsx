"use client";
// The admin's and accounts' report lists (To review, Asked to fix, Saved reports): filters, a count, and
// each report as a row that opens it. Refreshes itself every 30 seconds; the filters are never reset.
import { useMemo, useState } from "react";
import { Empty, Pill, TextInput } from "@/components/ui";
import { addDays, fmtDay, istToday } from "@/lib/shared/format";
import { STATUS_WORDS, statusTone, type ReportStatus, type ReportView } from "@/lib/shared/report";
import { Fetch } from "./Fetch";
import { DateRange, ProjectPick, rangeProblem, rangeQuery } from "./Filters";
import { crewMoneyLine, plural, projectLabel, workLine } from "./work";

export type ReportListItem = Omit<ReportView, "body"> & { fromOldApp: boolean };

const LIMIT = 400; // the server sends at most this many

export function ReportList({ status, allDates, emptyTitle, emptyText }: {
  status: ReportStatus;
  allDates?: boolean;      // start with no date limit (a waiting report is never hidden by its age)
  emptyTitle: string;
  emptyText?: string;      // shown only when no filter is set
}) {
  const today = istToday();
  const [project, setProject] = useState("");
  const [from, setFrom] = useState(allDates ? "" : addDays(today, -30));
  const [to, setTo] = useState(allDates ? "" : today);
  const [person, setPerson] = useState("");
  const problem = rangeProblem(from, to, false);
  const q = rangeQuery(from, to, project);
  const path = `/api/reports?status=${status}${q ? "&" + q : ""}`;

  return (
    <>
      <div className="card" data-testid="report-filters">
        <ProjectPick value={project} onChange={setProject} />
        <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} hint={allDates ? "Leave the dates empty to see every day." : "Leave a date empty for no limit."} />
        <TextInput label="Person" value={person} onChange={setPerson} placeholder="Name of the supervisor" type="search" testId="filter-person" maxLength={80} />
      </div>
      {problem ? <div className="notice warn" role="status"><b>Check the dates</b><span>{problem}</span></div> : (
        <Fetch<{ reports: ReportListItem[] }> path={path} every={30} isEmpty={(d) => !d.reports.length} empty={<Empty title={emptyTitle}>{(q ? null : emptyText) ?? "Nothing matches these filters."}</Empty>}>
          {(d) => <Rows reports={d.reports} person={person} />}
        </Fetch>
      )}
    </>
  );
}

function Rows({ reports, person }: { reports: ReportListItem[]; person: string }) {
  const q = person.trim().toLowerCase();
  const shown = useMemo(() => (q ? reports.filter((r) => (r.supervisorName || "").toLowerCase().includes(q)) : reports), [reports, q]);
  return (
    <>
      <div className="row between wrap" data-testid="report-count">
        <b>{q ? `${shown.length} of ${plural(reports.length, "report", "reports")}` : plural(reports.length, "report", "reports")}</b>
      </div>
      {reports.length >= LIMIT && (
        <div className="notice info" role="status"><span>Showing the newest {LIMIT}. Choose a shorter date range to see older ones.</span></div>
      )}
      {shown.length ? (
        <div className="list" data-testid="report-list">
          {shown.map((r) => <Row key={r.id} r={r} />)}
        </div>
      ) : <Empty title="Nobody by that name">None of these reports is from a person named &ldquo;{person.trim()}&rdquo;.</Empty>}
    </>
  );
}

function Row({ r }: { r: ReportListItem }) {
  const money = crewMoneyLine(r.summary);
  const work = workLine(r.summary);
  return (
    <a className="item" href={`/app/reports/view/${r.id}`} data-testid="report-row">
      <div className="grow stack tight" style={{ gap: 3 }}>
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <span className="title">{fmtDay(r.reportDate)}</span>
          <Pill tone={statusTone(r.status)}>{STATUS_WORDS[r.status]}</Pill>
        </div>
        <div className="small strong">{r.supervisorName || "—"}</div>
        <div className="sub">{projectLabel(r.projectName, r.projectId)}</div>
        <div className="sub">{money || work ? [money, work].filter(Boolean).join(" · ") : "No crew, money or measured work entered"}</div>
        {r.fromOldApp && <span className="tiny muted">From the old app</span>}
      </div>
    </a>
  );
}
