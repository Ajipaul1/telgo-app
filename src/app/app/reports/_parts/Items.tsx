"use client";
// Every line of one kind from the approved reports (admin, accounts): wages per report, or each bill of
// an expense kind, for a month or chosen dates. The total at the top is added up by the server.
import { useState } from "react";
import { Button, Empty, PicThumb } from "@/components/ui";
import { fmtDay, money, numIN } from "@/lib/shared/format";
import type { OtGroup, Pic } from "@/lib/shared/report";
import { Fetch } from "./Fetch";
import { ProjectPick, rangeQuery, useMonthRange } from "./Filters";
import { plural, projectLabel } from "./work";

export type ExpenseKind = "fuel" | "travel" | "room" | "tool" | "other";
export type ItemKind = "wages" | ExpenseKind;

type Head = { reportId: string; day: string; projectId: string; projectName: string | null; supervisorName: string; fromOldApp: boolean };
type WageLine = Head & { workers: number; wageRate: number | null; note: string; ot: OtGroup[]; total: number };
type BillLine = Head & { id: string; amount: number; name: string; note: string; bill: Pic | null };
type ItemsData<L> = { kind: ItemKind; items: L[]; total: number; capped?: boolean };

const NONE: Record<ItemKind, string> = { wages: "No wages", fuel: "No fuel bills", travel: "No travel bills", room: "No room rent bills", tool: "No tool rent bills", other: "No other expenses" };

const round2 = (x: number) => Math.round(x * 100) / 100;

// the content of the Wages, Fuel, Travel, Room rent, Tool rent and Other expenses screens
export function Items({ kind, title }: { kind: ItemKind; title: string }) {
  const period = useMonthRange();
  const [project, setProject] = useState("");
  const path = `/api/reports/items?kind=${kind}&${rangeQuery(period.from, period.to, project)}`;

  return (
    <>
      <div className="card" data-testid="items-filters">
        {period.picker}
        <ProjectPick value={project} onChange={setProject} />
      </div>
      {period.problem ? <div className="notice warn" role="status"><b>Check the dates</b><span>{period.problem}</span></div> : (
        <Fetch<ItemsData<WageLine | BillLine>> path={path} every={60} isEmpty={(d) => !d.items.length}
          empty={<Empty title={`${NONE[kind]} in these dates`}>Lines appear here once their reports are approved.</Empty>}>
          {(d) => (
            <>
              {d.capped && <div className="notice warn" role="status"><b>Too many reports for one screen</b><span>Only the newest 1,000 approved reports are added up here. Choose fewer days or one project.</span></div>}
              <div className="stat spark" data-testid="items-total">
                <b style={{ fontSize: 28, overflowWrap: "anywhere" }}>{money(d.total)}</b>
                <span>{title}, total{period.label ? ` · ${period.label}` : ""}</span>
              </div>
              {kind === "wages"
                ? <WageLines items={d.items as WageLine[]} />
                : <BillLines items={d.items as BillLine[]} />}
              <p className="tiny muted center">Only approved reports are counted.</p>
            </>
          )}
        </Fetch>
      )}
    </>
  );
}

function Where({ l }: { l: Head }) {
  return (
    <>
      <div className="small strong">{projectLabel(l.projectName, l.projectId)}</div>
      <div className="small muted">Sent by {l.supervisorName || "—"}</div>
    </>
  );
}

function Foot({ l }: { l: Head }) {
  return (
    <>
      {l.fromOldApp && <span className="tiny muted">From the old app</span>}
      <Button kind="soft" href={`/app/reports/view/${l.reportId}`} testId="open-report">Open the report</Button>
    </>
  );
}

// ---------- bills (fuel, travel, room rent, tool rent, other) ----------
function BillLines({ items }: { items: BillLine[] }) {
  const noBill = items.filter((l) => !l.bill).length;
  return (
    <>
      <p className="small muted" data-testid="items-count">{plural(items.length, "line", "lines")}{noBill ? ` · ${numIN(noBill, 0)} without a bill` : ""}</p>
      <div className="stack" data-testid="item-lines">
        {items.map((l) => (
          <div key={l.id} className="card" data-testid="item-line">
            <div className="row between" style={{ alignItems: "baseline" }}>
              <b style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--brand)", overflowWrap: "anywhere" }}>{money(l.amount)}</b>
              <span className="small muted">{fmtDay(l.day)}</span>
            </div>
            <Where l={l} />
            {(l.name || l.note) && (
              <div className="stack tight" style={{ gap: 2 }}>
                {l.name && <div className="small">{l.name}</div>}
                {l.note && <div className="small muted" style={{ overflowWrap: "anywhere" }}>{l.note}</div>}
              </div>
            )}
            {l.bill ? <div className="thumbs"><PicThumb pic={l.bill} label={`Bill, ${money(l.amount)}`} /></div> : <span className="small muted">No bill added</span>}
            <Foot l={l} />
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- wages (crew and overtime per report) ----------
function WageLines({ items }: { items: WageLine[] }) {
  return (
    <>
      <p className="small muted" data-testid="items-count">{plural(items.length, "report", "reports")} with wages</p>
      <div className="stack" data-testid="item-lines">
        {items.map((l) => {
          const crew = l.wageRate === null ? null : round2(l.workers * l.wageRate);
          const ot = l.ot.map((g) => ({ ...g, amount: round2(g.workers * g.hours * g.rate) }));
          const fromLines = round2((crew ?? 0) + ot.reduce((a, g) => a + g.amount, 0));
          return (
            <div key={l.reportId} className="card" data-testid="item-line">
              <div className="row between" style={{ alignItems: "baseline" }}>
                <b style={{ fontFamily: "var(--font-head)", fontSize: 20, color: "var(--brand)", overflowWrap: "anywhere" }}>{money(l.total)}</b>
                <span className="small muted">{fmtDay(l.day)}</span>
              </div>
              <Where l={l} />
              <div className="stack tight" style={{ gap: 4 }}>
                <div className="small">
                  {plural(l.workers, "worker", "workers")} × {l.wageRate === null ? "rate not recorded" : `${money(l.wageRate)} a day`}
                  {crew !== null && <> = <b>{money(crew)}</b></>}
                </div>
                {ot.map((g, i) => (
                  <div key={i} className="small">
                    Overtime: {plural(g.workers, "worker", "workers")} × {numIN(g.hours)} h × {money(g.rate)} an hour = <b>{money(g.amount)}</b>
                    {g.note && <span className="muted"> · {g.note}</span>}
                  </div>
                ))}
                {l.note && <div className="small muted" style={{ overflowWrap: "anywhere" }}>Note: {l.note}</div>}
                {l.wageRate !== null && fromLines !== round2(l.total) && (
                  <div className="tiny muted">The lines above add up to {money(fromLines)}; the report saved {money(l.total)}.</div>
                )}
              </div>
              <div className="row between"><span className="small muted">Total</span><b>{money(l.total)}</b></div>
              <Foot l={l} />
            </div>
          );
        })}
      </div>
    </>
  );
}
