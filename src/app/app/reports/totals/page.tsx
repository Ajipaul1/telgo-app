"use client";
// Totals (admin, accounts): money and work for a month or chosen dates, from the approved reports only
// (the database view v_ledger_daily), then day by day, with a CSV made on the phone from what was loaded.
import { useState } from "react";
import { Screen } from "@/components/Screen";
import { Button, Empty } from "@/components/ui";
import { fmtDay, metres, money, numIN } from "@/lib/shared/format";
import { Fetch } from "../_parts/Fetch";
import { ProjectPick, rangeQuery, useMonthRange } from "../_parts/Filters";
import { plural, projectLabel, workLine } from "../_parts/work";

type Day = {
  day: string; projectId: string; projectName: string | null; reports: number;
  workers: number; otHours: number; wages: number; fuel: number; travel: number; roomRent: number; toolRent: number; other: number;
  trenchingM: number; hddM: number; cableLayingM: number; cableMountingM: number; joints: number; rmu: number; terminations: number;
};
type Total = Omit<Day, "day" | "projectId" | "projectName"> & { spent: number };
type TotalsData = { from: string; to: string; days: Day[]; total: Total };

const spentOf = (d: Day) => Math.round((d.wages + d.fuel + d.travel + d.roomRent + d.toolRent + d.other) * 100) / 100;

function moneyLine(d: Day) {
  const parts: [string, number][] = [["Wages", d.wages], ["Fuel", d.fuel], ["Travel", d.travel], ["Room rent", d.roomRent], ["Tool rent", d.toolRent], ["Other", d.other]];
  return parts.filter(([, v]) => v > 0).map(([k, v]) => `${k} ${money(v)}`).join(" · ");
}

const workOf = (d: Day) => workLine({ trenching: d.trenchingM, hdd: d.hddM, cableLaying: d.cableLayingM, cableMounting: d.cableMountingM, joints: d.joints, rmu: d.rmu, terminations: d.terminations });

// ---------- CSV, built on the phone from the loaded days ----------
const cell = (v: string | number) => { const s = String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

function downloadCsv(d: TotalsData) {
  const head = ["Day", "Project", "Approved reports", "Worker-days", "Overtime worker-hours", "Wages", "Fuel", "Travel", "Room rent", "Tool rent", "Other", "Spent",
    "Trenching (m)", "HDD (m)", "Cable laying (m)", "Cable mounting (m)", "Joints", "RMU foundations", "Terminations"];
  const rows = d.days.map((x) => [x.day, projectLabel(x.projectName, x.projectId), x.reports, x.workers, x.otHours, x.wages, x.fuel, x.travel, x.roomRent, x.toolRent, x.other, spentOf(x),
    x.trenchingM, x.hddM, x.cableLayingM, x.cableMountingM, x.joints, x.rmu, x.terminations]);
  const t = d.total;
  rows.push(["Total", "", t.reports, t.workers, t.otHours, t.wages, t.fuel, t.travel, t.roomRent, t.toolRent, t.other, t.spent,
    t.trenchingM, t.hddM, t.cableLayingM, t.cableMountingM, t.joints, t.rmu, t.terminations]);
  const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `telgo-totals-${d.from}-to-${d.to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const Stat = ({ label, value, tone, wide }: { label: string; value: string; tone?: "spark"; wide?: boolean }) => (
  <div className={"stat" + (tone ? " " + tone : "")} style={wide ? { gridColumn: "1 / -1" } : undefined}>
    <b style={{ overflowWrap: "anywhere" }}>{value}</b><span>{label}</span>
  </div>
);

export default function Totals() {
  const period = useMonthRange();
  const [project, setProject] = useState("");
  const path = `/api/reports/totals?${rangeQuery(period.from, period.to, project)}`;

  return (
    <Screen title="Totals" roles={["admin", "finance"]} testId="reports-totals">
      <div className="card" data-testid="totals-filters">
        {period.picker}
        <ProjectPick value={project} onChange={setProject} />
      </div>
      {period.problem ? <div className="notice warn" role="status"><b>Check the dates</b><span>{period.problem}</span></div> : (
        <Fetch<TotalsData> path={path} every={60} isEmpty={(d) => !d.days.length}
          empty={<Empty title="No approved reports in these dates">Totals appear here once reports for these days are approved.</Empty>}>
          {(d) => (
            <>
              <p className="small muted">{fmtDay(d.from)} to {fmtDay(d.to)} · {plural(d.total.reports, "approved report", "approved reports")}</p>
              <div className="section-title">Money</div>
              <div className="grid2" data-testid="totals-money">
                <Stat label="Spent" value={money(d.total.spent)} tone="spark" wide />
                <Stat label="Wages" value={money(d.total.wages)} />
                <Stat label="Fuel" value={money(d.total.fuel)} />
                <Stat label="Travel" value={money(d.total.travel)} />
                <Stat label="Room rent" value={money(d.total.roomRent)} />
                <Stat label="Tool rent" value={money(d.total.toolRent)} />
                <Stat label="Other" value={money(d.total.other)} />
              </div>
              <div className="section-title">Work</div>
              <div className="grid2" data-testid="totals-work">
                <Stat label="Trenching" value={metres(d.total.trenchingM)} />
                <Stat label="HDD" value={metres(d.total.hddM)} />
                <Stat label="Cable laying" value={metres(d.total.cableLayingM)} />
                <Stat label="Cable mounting" value={metres(d.total.cableMountingM)} />
                <Stat label="Joints" value={numIN(d.total.joints)} />
                <Stat label="RMU foundations" value={numIN(d.total.rmu)} />
                <Stat label="Terminations" value={numIN(d.total.terminations)} />
                <Stat label="Worker-days" value={numIN(d.total.workers)} />
                <Stat label="Overtime worker-hours" value={`${numIN(d.total.otHours)} h`} />
                <Stat label="Approved reports" value={numIN(d.total.reports, 0)} />
              </div>
              <Button kind="ghost" block testId="download-csv" onClick={() => downloadCsv(d)}>Download CSV</Button>

              <div className="section-title">Day by day ({d.days.length})</div>
              <div className="stack" data-testid="totals-days">
                {d.days.map((x) => {
                  const ml = moneyLine(x);
                  const wl = workOf(x);
                  return (
                    <div key={x.day + x.projectId} className="card" data-testid="totals-day">
                      <div className="row between"><b>{fmtDay(x.day)}</b><span className="small muted">{plural(x.reports, "report", "reports")}</span></div>
                      <div className="small strong">{projectLabel(x.projectName, x.projectId)}</div>
                      <div className="small">Spent {money(spentOf(x))}{ml ? ` · ${ml}` : ""}</div>
                      <div className="small muted">{wl || "No measured work"}{x.workers > 0 ? ` · ${plural(x.workers, "worker-day", "worker-days")}` : ""}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Fetch>
      )}
      <div className="card">
        <p className="small muted">Totals come only from approved reports, straight from the database, so nothing is counted twice.</p>
      </div>
    </Screen>
  );
}
