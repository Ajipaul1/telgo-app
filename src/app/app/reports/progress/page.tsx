"use client";
// Site progress (admin, accounts): the work done in the approved reports for a month or chosen dates,
// the totals of each kind first, then report by report.
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { Button, Empty } from "@/components/ui";
import { fmtDay, metres, numIN } from "@/lib/shared/format";
import { WORK, WORK_LABEL, type Summary, type WorkKey } from "@/lib/shared/report";
import { Fetch } from "../_parts/Fetch";
import { ProjectPick, rangeQuery, useMonthRange } from "../_parts/Filters";
import { SUMMARY_KEY, plural, projectLabel, workAmount } from "../_parts/work";

type Line = {
  reportId: string; day: string; projectId: string; projectName: string | null; supervisorName: string;
  summary: Summary; work: { key: WorkKey; value: number; note: string; photos: number }[];
};
type Total = { trenching: number; hdd: number; cableLaying: number; cableMounting: number; joints: number; rmu: number; terminations: number };
type ProgressData = { kind: "progress"; items: Line[]; total: Total };

export default function SiteProgress() {
  const period = useMonthRange();
  const [project, setProject] = useState("");
  const path = `/api/reports/items?kind=progress&${rangeQuery(period.from, period.to, project)}`;

  return (
    <Screen title="Site progress" roles={["admin", "finance"]} testId="reports-progress">
      <div className="card" data-testid="progress-filters">
        {period.picker}
        <ProjectPick value={project} onChange={setProject} />
      </div>
      {period.problem ? <div className="notice warn" role="status"><b>Check the dates</b><span>{period.problem}</span></div> : (
        <Fetch<ProgressData> path={path} every={60} isEmpty={(d) => !d.items.length}
          empty={<Empty title="No work in approved reports in these dates">Work appears here once its report is approved.</Empty>}>
          {(d) => (
            <>
              <div className="grid2" data-testid="progress-totals">
                <div className="stat"><b>{metres(d.total.trenching)}</b><span>Trenching</span></div>
                <div className="stat"><b>{metres(d.total.hdd)}</b><span>HDD</span></div>
                <div className="stat"><b>{metres(d.total.cableLaying)}</b><span>Cable laying</span></div>
                <div className="stat"><b>{metres(d.total.cableMounting)}</b><span>Cable mounting</span></div>
                <div className="stat"><b>{numIN(d.total.joints)}</b><span>Joints</span></div>
                <div className="stat"><b>{numIN(d.total.rmu)}</b><span>RMU foundations</span></div>
                <div className="stat"><b>{numIN(d.total.terminations)}</b><span>Terminations</span></div>
                <div className="stat"><b>{numIN(d.items.length, 0)}</b><span>Reports with work</span></div>
              </div>
              <div className="section-title">Report by report</div>
              <div className="stack" data-testid="progress-list">
                {d.items.map((l) => (
                  <div key={l.reportId} className="card" data-testid="progress-line">
                    <div className="row between"><b>{fmtDay(l.day)}</b><span className="small muted">{l.supervisorName || "—"}</span></div>
                    <div className="small strong">{projectLabel(l.projectName, l.projectId)}</div>
                    <ul className="stack tight" style={{ margin: 0, padding: 0, listStyle: "none" }}>
                      {WORK.map((w) => {
                        const value = Number(l.summary[SUMMARY_KEY[w.key]] ?? 0) || 0;
                        if (value <= 0) return null;
                        const item = l.work.find((x) => x.key === w.key);
                        return (
                          <li key={w.key} className="small">
                            <div className="row between" style={{ alignItems: "baseline" }}>
                              <span>{WORK_LABEL[w.key]}</span>
                              <b>{workAmount(w.key, value)}</b>
                            </div>
                            <div className="tiny muted">
                              {item?.photos ? plural(item.photos, "photo", "photos") : "No photo"}
                              {w.key === "hdd" && !item?.value ? " · from the rod log" : ""}
                              {item?.note ? ` · ${item.note}` : ""}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <Button kind="soft" href={`/app/reports/view/${l.reportId}`} testId="open-report">Open the report</Button>
                  </div>
                ))}
              </div>
              <p className="tiny muted center">Only approved reports are counted.</p>
            </>
          )}
        </Fetch>
      )}
    </Screen>
  );
}
