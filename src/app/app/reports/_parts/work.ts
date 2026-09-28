// Shared words for the report screens: the work done and the money in one line, from a report's summary
// (the stored columns, which are what the totals add up). Only what is really there; zeros are left out.
import { metres, money, numIN } from "@/lib/shared/format";
import { WORK, type Summary, type WorkKey } from "@/lib/shared/report";

// the summary field for each kind of work
export const SUMMARY_KEY: Record<WorkKey, keyof Summary> = {
  trenching: "trenching", hdd: "hdd", cable_laying: "cableLaying", cable_mounting: "cableMounting", joints: "joints", rmu: "rmu", terminations: "terminations",
};

// short names for a one-line summary
export const WORK_SHORT: Record<WorkKey, string> = {
  trenching: "Trenching", hdd: "HDD", cable_laying: "Cable laying", cable_mounting: "Cable mounting", joints: "Joints", rmu: "RMU foundations", terminations: "Terminations",
};

export const unitOf = (key: WorkKey) => WORK.find((w) => w.key === key)?.unit ?? "count";

// "120 m" for lengths, "3" for counts
export const workAmount = (key: WorkKey, v: number) => (unitOf(key) === "m" ? metres(v) : numIN(v, 2));

// the non-zero kinds of work in a summary, in the menu's order
export function workParts(s: Partial<Record<keyof Summary, number>>): { key: WorkKey; value: number; text: string }[] {
  return WORK.map((w) => ({ key: w.key, value: Number(s[SUMMARY_KEY[w.key]] ?? 0) || 0 }))
    .filter((x) => x.value > 0)
    .map((x) => ({ ...x, text: `${WORK_SHORT[x.key]} ${workAmount(x.key, x.value)}` }));
}

export const workLine = (s: Partial<Record<keyof Summary, number>>) => workParts(s).map((p) => p.text).join(" · ");

// "8 workers · Wages ₹6,400 · Expenses ₹1,200"
export function crewMoneyLine(s: Summary) {
  const parts: string[] = [];
  if (s.workers > 0) parts.push(`${numIN(s.workers, 0)} ${s.workers === 1 ? "worker" : "workers"}`);
  if (s.wages > 0) parts.push(`Wages ${money(s.wages)}`);
  if (s.expenses > 0) parts.push(`Expenses ${money(s.expenses)}`);
  return parts.join(" · ");
}

export const projectLabel = (name: string | null | undefined, id: string) => name || `Unknown project (${id})`;

export const plural = (n: number, one: string, many: string) => `${numIN(n, 0)} ${n === 1 ? one : many}`;
