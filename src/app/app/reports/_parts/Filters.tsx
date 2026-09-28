"use client";
// The filters the report screens share: a project, a month (or chosen dates), a from/to pair.
import { useId, useMemo, useState } from "react";
import { Field, Loaded, Select } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import { addDays, istToday } from "@/lib/shared/format";

type ProjectOption = { id: string; name: string };

// every project this login may see, with "All projects" first
export function ProjectPick({ value, onChange, testId = "filter-project" }: { value: string; onChange: (v: string) => void; testId?: string }) {
  const load = useLoad<{ projects: ProjectOption[] }>("/api/projects");
  return (
    <Loaded load={load} skeleton={1}>
      {(d) => (
        <Select label="Project" value={value} onChange={onChange} testId={testId}
          options={[{ value: "", label: "All projects" }, ...d.projects.map((p) => ({ value: p.id, label: p.name || p.id }))]} />
      )}
    </Loaded>
  );
}

function DateBox({ label, value, onChange, testId }: { label: string; value: string; onChange: (v: string) => void; testId: string }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <input id={id} className="input" type="date" value={value} max={istToday()} data-testid={testId} style={{ minWidth: 0, paddingLeft: 10, paddingRight: 8 }}
        onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function DateRange({ from, to, onFrom, onTo, hint }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; hint?: string }) {
  return (
    <div className="stack tight">
      <div className="grid2" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
        <DateBox label="From" value={from} onChange={onFrom} testId="filter-from" />
        <DateBox label="To" value={to} onChange={onTo} testId="filter-to" />
      </div>
      {hint && <span className="tiny muted">{hint}</span>}
    </div>
  );
}

// the dates are good to ask for? (a message in words when not)
export function rangeProblem(from: string, to: string, needBoth: boolean) {
  if (needBoth && (!from || !to)) return "Choose both dates.";
  if (from && to && to < from) return "The end date is before the start date.";
  if (from && to && Date.parse(to) - Date.parse(from) > 366 * 86400e3) return "Choose at most one year at a time.";
  return null;
}

// ---------- a month (the last 12, "This month" first) or chosen dates ----------
const CUSTOM = "custom";
const monthName = (ym: string) => new Date(ym + "-01T00:00:00Z").toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

function monthRange(ym: string, today: string) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { from: `${ym}-01`, to: last < today ? last : today };
}

export function useMonthRange() {
  const today = istToday();
  const months = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    let y = Number(today.slice(0, 4));
    let m = Number(today.slice(5, 7));
    for (let i = 0; i < 12; i++) {
      const ym = `${y}-${String(m).padStart(2, "0")}`;
      out.push({ value: ym, label: i === 0 ? `This month (${monthName(ym)})` : monthName(ym) });
      m -= 1;
      if (m === 0) { m = 12; y -= 1; }
    }
    return out;
  }, [today]);
  const [month, setMonth] = useState<string>(months[0].value);
  const [custom, setCustom] = useState(() => ({ from: addDays(today, -30), to: today }));
  const range = month === CUSTOM ? custom : monthRange(month, today);
  const problem = month === CUSTOM ? rangeProblem(custom.from, custom.to, true) : null;

  const picker = (
    <div className="stack tight">
      <Select label="Month" value={month} testId="filter-month"
        onChange={(v) => { if (v === CUSTOM && month !== CUSTOM) setCustom(monthRange(month, today)); setMonth(v); }}
        options={[...months, { value: CUSTOM, label: "Choose dates…" }]} />
      {month === CUSTOM && (
        <DateRange from={custom.from} to={custom.to} onFrom={(v) => setCustom((c) => ({ ...c, from: v }))} onTo={(v) => setCustom((c) => ({ ...c, to: v }))} />
      )}
    </div>
  );
  return { ...range, problem, picker, label: month === CUSTOM ? null : months.find((x) => x.value === month)?.label ?? null };
}

// the query string for a range and a project
export function rangeQuery(from: string, to: string, project: string) {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  if (project) q.set("project", project);
  return q.toString();
}
