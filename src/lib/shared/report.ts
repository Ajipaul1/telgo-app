// The daily site report: one shape for the form, the server and every screen.
// New reports keep their lists in `details` (v2). Reports sent by the old app keep theirs in
// stock_available.richDetails; normalizeReport() reads both into the same shape, so old and new
// reports look the same everywhere. The totals are always worked out from the lists, never typed.
import type { LatLng } from "./geo";

export type ExpenseCategory = "fuel" | "travel" | "room" | "tool" | "other";
export const EXPENSE_LABEL: Record<ExpenseCategory, string> = { fuel: "Fuel", travel: "Travel", room: "Room rent", tool: "Tool rent", other: "Other" };
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ["fuel", "travel", "room", "tool", "other"];

export type WorkKey = "trenching" | "hdd" | "cable_laying" | "cable_mounting" | "joints" | "rmu" | "terminations";
export const WORK: { key: WorkKey; label: string; unit: "m" | "count"; route?: boolean }[] = [
  { key: "trenching", label: "Open trench (trenching)", unit: "m", route: true },
  { key: "hdd", label: "HDD drilling", unit: "m" },
  { key: "cable_laying", label: "Cable laying", unit: "m", route: true },
  { key: "cable_mounting", label: "Cable mounting", unit: "m" },
  { key: "joints", label: "Cable joints", unit: "count" },
  { key: "rmu", label: "RMU foundations", unit: "count" },
  { key: "terminations", label: "Terminations", unit: "count" },
];
export const WORK_LABEL = Object.fromEntries(WORK.map((w) => [w.key, w.label])) as Record<WorkKey, string>;

export const STRATA = ["Clay", "Sand", "Soft rock", "Hard rock", "Water", "Other"] as const;
export const AGENCIES = ["PWD", "KSEB", "NH", "Panchayat"] as const;
export type ClearanceStatus = "none" | "applied" | "demand_note" | "granted";
export const CLEARANCE_LABEL: Record<ClearanceStatus, string> = { none: "Not started", applied: "Applied", demand_note: "Demand note issued", granted: "Permission granted" };

// a photo or bill: a stored file (new) or the picture the old app kept inside the report (legacy)
export type Pic = { fileId?: string | null; legacy?: string | null; mime?: string | null };

export type OtGroup = { workers: number; hours: number; rate: number; note: string };
export type Expense = { id: string; category: ExpenseCategory; amount: number; name: string; note: string; bill: Pic | null };
export type WorkItem = { key: WorkKey; value: number; note: string; photos: Pic[]; route: LatLng[] };
export type HddRod = { no: number; pitch: string; depth: string; strata: string; crossing: string };
export type Hdd = { machine: string; vendor: string; tracker: string; operator: string; ducts: string; rodLengthM: number | null; rods: HddRod[] };
export type Clearance = { agency: string; status: ClearanceStatus; note: string; receipt: Pic | null };
export type Notes = { workDone: string; problems: string; plans: string; moneyNeeded: number | null; moneyReason: string; moneyReceipt: Pic | null; toAdmin: string };

export type ReportBody = {
  crew: { workers: number; wageRate: number | null; wagesNote: string; ot: OtGroup[] };
  expenses: Expense[];
  work: WorkItem[];
  hdd: Hdd | null;
  clearances: Clearance[];
  notes: Notes;
  sentFrom: { lat: number; lng: number; accuracy: number | null } | null;
};

export type ReportStatus = "pending" | "clarification" | "approved";
export const STATUS_WORDS: Record<ReportStatus, string> = { pending: "Waiting for review", clarification: "Asked to fix", approved: "Approved" };
export const statusTone = (s: ReportStatus) => (s === "approved" ? "ok" : s === "clarification" ? "bad" : "warn") as "ok" | "bad" | "warn";

export type Summary = {
  workers: number; otHours: number; wages: number;
  fuel: number; travel: number; room: number; tool: number; other: number; expenses: number;
  trenching: number; hdd: number; cableLaying: number; cableMounting: number; joints: number; rmu: number; terminations: number;
};

export type ReportView = {
  id: string;
  reportDate: string;
  projectId: string;
  projectName: string | null;       // null = the project doesn't exist (a sample project of the old app)
  supervisorId: string;
  supervisorName: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  approvedByName: string | null;
  fromOldApp: boolean;
  body: ReportBody;
  summary: Summary;
  archivedAt: string | null;
  trashedAt: string | null;
};

const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const round2 = (x: number) => Math.round(x * 100) / 100;

export function emptyBody(): ReportBody {
  return {
    crew: { workers: 0, wageRate: null, wagesNote: "", ot: [] },
    expenses: [],
    work: [],
    hdd: null,
    clearances: [],
    notes: { workDone: "", problems: "", plans: "", moneyNeeded: null, moneyReason: "", moneyReceipt: null, toAdmin: "" },
    sentFrom: null,
  };
}

// HDD metres from the rod log (rods × rod length), when a rod length is known
export const hddFromRods = (h: Hdd | null) => (h && h.rodLengthM && h.rods.length ? round2(h.rods.length * h.rodLengthM) : 0);

export function summarize(b: ReportBody): Summary {
  const crewWages = n(b.crew.workers) * n(b.crew.wageRate);
  const ot = b.crew.ot.reduce((a, g) => a + n(g.workers) * n(g.hours) * n(g.rate), 0);
  const otHours = b.crew.ot.reduce((a, g) => a + n(g.workers) * n(g.hours), 0);
  const cat = (c: ExpenseCategory) => round2(b.expenses.filter((e) => e.category === c).reduce((a, e) => a + n(e.amount), 0));
  const w = (k: WorkKey) => n(b.work.find((x) => x.key === k)?.value);
  const hddTyped = w("hdd");
  const sum = { fuel: cat("fuel"), travel: cat("travel"), room: cat("room"), tool: cat("tool"), other: cat("other") };
  return {
    workers: n(b.crew.workers),
    otHours: round2(otHours),
    wages: round2(crewWages + ot),
    ...sum,
    expenses: round2(sum.fuel + sum.travel + sum.room + sum.tool + sum.other),
    trenching: w("trenching"),
    hdd: hddTyped || hddFromRods(b.hdd),
    cableLaying: w("cable_laying"),
    cableMounting: w("cable_mounting"),
    joints: w("joints"),
    rmu: w("rmu"),
    terminations: w("terminations"),
  };
}

// every stored file a report points at (the server uses it to check who may open a photo)
export function fileIdsOf(b: ReportBody): string[] {
  const ids = new Set<string>();
  const add = (p: Pic | null | undefined) => { if (p?.fileId) ids.add(p.fileId); };
  b.expenses.forEach((e) => add(e.bill));
  b.work.forEach((w) => w.photos.forEach(add));
  b.clearances.forEach((c) => add(c.receipt));
  add(b.notes.moneyReceipt);
  return [...ids];
}

// ---------- reading a stored report (new or old) ----------
const pic = (v: unknown): Pic | null => {
  if (!v) return null;
  if (typeof v === "string") return v.startsWith("data:") ? { legacy: v, mime: v.slice(5, v.indexOf(";")) } : null;
  if (typeof v === "object" && (v as Pic).fileId) return { fileId: (v as Pic).fileId, mime: (v as Pic).mime ?? null };
  return null;
};

function oldClearanceStatus(v: unknown): ClearanceStatus {
  const t = s(v).toLowerCase();
  if (t.includes("granted")) return "granted";
  if (t.includes("demand")) return "demand_note";
  if (t.includes("applied") || t.includes("initiated")) return "applied";
  return "none";
}

function fromOld(row: Record<string, unknown>): ReportBody {
  const rd = ((row.stock_available as Record<string, unknown>)?.richDetails ?? {}) as Record<string, unknown>;
  const b = emptyBody();
  b.crew.workers = n(row.labor_count);
  b.crew.wageRate = rd.workerWageRate !== undefined ? n(rd.workerWageRate) : null;
  b.crew.wagesNote = s(rd.laborWagesNarration);
  b.crew.ot = (Array.isArray(rd.otWorkers) ? rd.otWorkers : []).map((g: Record<string, unknown>) => ({
    workers: n(g.workerCount ?? 1), hours: n(g.hours), rate: n(g.rate), note: s(g.narration),
  }));
  const lists: [ExpenseCategory, string][] = [["fuel", "fuelExpensesList"], ["travel", "travelExpensesList"], ["room", "roomRentList"], ["tool", "toolRentList"], ["other", "otherExpensesList"]];
  let i = 0;
  for (const [category, key] of lists) {
    for (const e of (Array.isArray(rd[key]) ? rd[key] : []) as Record<string, unknown>[]) {
      b.expenses.push({ id: `old-${i++}`, category, amount: n(e.amount), name: s(e.toolName ?? e.name), note: s(e.narration), bill: pic(e.billImage) });
    }
  }
  // what the old app saved in a total but not in its item list is shown as one line per kind, so the
  // lines always add up to the stored totals (the old app put "other" expenses into its travel total)
  const listed = (c: ExpenseCategory) => b.expenses.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0);
  const cols: [ExpenseCategory, string, number][] = [
    ["fuel", "fuel_expenses", listed("fuel")], ["travel", "travel_expenses", listed("travel") + listed("other")],
    ["room", "room_rent", listed("room")], ["tool", "tool_rent", listed("tool")], ["other", "other_expenses", 0],
  ];
  for (const [category, col, have] of cols) {
    const gap = round2(n(row[col]) - have);
    if (gap > 0.5) b.expenses.push({ id: `old-${i++}`, category, amount: gap, name: "", note: "Saved by the old app without its item list", bill: null });
  }
  const wip = (rd.wipProgressList ?? {}) as Record<string, Record<string, unknown>>;
  const map: [WorkKey, string, string][] = [
    ["trenching", "trenching", "excavation_length"], ["hdd", "hdd", "hdd_length"], ["cable_laying", "cableLaying", "cable_laying_length"],
    ["cable_mounting", "cableMounding", "cable_mounding_length"], ["joints", "joining", "joining_links_completed"],
    ["rmu", "rmu", "rmu_foundation_status"], ["terminations", "terminations", "termination_endpoints"],
  ];
  for (const [key, oldKey, col] of map) {
    const w = wip[oldKey] ?? {};
    const value = n(row[col]);
    const route: LatLng[] = Array.isArray(w.path) ? (w.path as unknown[]).map((p) => (Array.isArray(p) ? [n(p[0]), n(p[1])] as LatLng : null)).filter((p): p is LatLng => !!p && p[0] !== 0)
      : [w.startLat && w.startLng ? [n(w.startLat), n(w.startLng)] as LatLng : null, w.endLat && w.endLng ? [n(w.endLat), n(w.endLng)] as LatLng : null].filter((p): p is LatLng => !!p);
    const photo = pic(w.photo);
    if (value || s(w.narration) || photo) b.work.push({ key, value, note: s(w.narration), photos: photo ? [photo] : [], route });
  }
  const meta = (row.hdd_metadata ?? {}) as Record<string, unknown>;
  const rods = (Array.isArray(row.hdd_drilling_logs) ? row.hdd_drilling_logs : []) as Record<string, unknown>[];
  if (rods.length || Object.keys(meta).length) {
    b.hdd = {
      machine: s(meta.machineName ?? meta.hddMachineName), vendor: s(meta.vendorName ?? meta.hddVendorName), tracker: s(meta.trackerName ?? meta.hddTrackerName),
      operator: s(meta.operatorName ?? meta.hddOperatorName), ducts: s(meta.ductsInfo ?? meta.hddDuctsInfo),
      rodLengthM: meta.rodLengthM ?? meta.hddRodLengthM ? n(meta.rodLengthM ?? meta.hddRodLengthM) : null,
      rods: rods.map((r, k) => ({ no: n(r.rodNo ?? k + 1), pitch: s(r.pitch), depth: s(r.depth), strata: s(r.strata), crossing: s(r.crossing) })),
    };
  }
  const cl = (row.clearances ?? {}) as Record<string, Record<string, unknown>>;
  for (const agency of Object.keys(cl)) {
    const c = cl[agency] ?? {};
    const st = oldClearanceStatus(c.status);
    const receipt = pic(c.receipt);
    if (st !== "none" || receipt) b.clearances.push({ agency, status: st, note: "", receipt });
  }
  const rn = (rd.requestsAndNotes ?? {}) as Record<string, unknown>;
  b.notes = {
    workDone: s(rn.dailyWorkReport), problems: s(rn.problems), plans: s(rn.plans),
    moneyNeeded: rn.financeAmount ? n(rn.financeAmount) : null, moneyReason: s(rn.financeNarration), moneyReceipt: pic(rn.financeReceipt), toAdmin: s(rn.adminConcerns),
  };
  if (rd.startGpsLat && rd.startGpsLng) b.sentFrom = null;
  return b;
}

export function bodyFromRow(row: Record<string, unknown>): { body: ReportBody; fromOldApp: boolean } {
  const d = row.details as { v?: number; body?: ReportBody } | null;
  if (d && d.v === 2 && d.body) return { body: { ...emptyBody(), ...d.body }, fromOldApp: false };
  return { body: fromOld(row), fromOldApp: true };
}

// the stored columns are the truth for totals (what the ledger adds up)
export function summaryFromRow(row: Record<string, unknown>): Summary {
  const x = (k: string) => n(row[k]);
  const s5 = { fuel: x("fuel_expenses"), travel: x("travel_expenses"), room: x("room_rent"), tool: x("tool_rent"), other: x("other_expenses") };
  return {
    workers: x("labor_count"), otHours: row.ot_hours_exact !== null && row.ot_hours_exact !== undefined ? x("ot_hours_exact") : x("ot_hours"), wages: x("calculated_wages"),
    ...s5, expenses: round2(s5.fuel + s5.travel + s5.room + s5.tool + s5.other),
    trenching: x("excavation_length"), hdd: x("hdd_length"), cableLaying: x("cable_laying_length"), cableMounting: x("cable_mounding_length"),
    joints: x("joining_links_completed"), rmu: x("rmu_foundation_status"), terminations: x("termination_endpoints"),
  };
}

export function normalizeReport(row: Record<string, unknown>, projectName: string | null): ReportView {
  const { body, fromOldApp } = bodyFromRow(row);
  return {
    id: String(row.id),
    reportDate: String(row.report_date),
    projectId: String(row.project_id),
    projectName,
    supervisorId: String(row.supervisor_id),
    supervisorName: String(row.supervisor_name ?? ""),
    status: (["pending", "clarification", "approved"].includes(String(row.status)) ? row.status : "pending") as ReportStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
    approvedAt: (row.approved_at as string) ?? null,
    approvedByName: (row.approved_by_name as string) ?? null,
    fromOldApp,
    body,
    summary: summaryFromRow(row),
    archivedAt: (row.archived_at as string) ?? null,
    trashedAt: (row.trashed_at as string) ?? null,
  };
}

// what a client may see: the work, never the money
export function forClient(r: ReportView): ReportView {
  return {
    ...r,
    body: { ...r.body, crew: { workers: r.body.crew.workers, wageRate: null, wagesNote: "", ot: [] }, expenses: [], notes: { ...emptyBody().notes, workDone: r.body.notes.workDone } },
    summary: { ...r.summary, wages: 0, fuel: 0, travel: 0, room: 0, tool: 0, other: 0, expenses: 0 },
  };
}
