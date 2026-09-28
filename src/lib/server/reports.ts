import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { T } from "./core";
import { fail } from "./doctor";
import { rows, maybe } from "./truth";
import { list, num, obj, oneOf, optNum, str } from "./validate";
import type { Me } from "./session";
import { clientProjectIds } from "./projects";
import {
  AGENCIES, EXPENSE_CATEGORIES, STRATA, WORK, emptyBody, fileIdsOf, forClient, normalizeReport, summarize,
  type ClearanceStatus, type Pic, type ReportBody, type ReportView, type WorkKey,
} from "@/lib/shared/report";
import { toLatLng, type LatLng } from "@/lib/shared/geo";

export const LIST_COLS = "id,report_date,project_id,supervisor_id,supervisor_name,status,created_at,updated_at,approved_at,approved_by_name,labor_count,ot_hours,ot_hours_exact,calculated_wages,fuel_expenses,travel_expenses,room_rent,tool_rent,other_expenses,excavation_length,hdd_length,cable_laying_length,cable_mounding_length,joining_links_completed,rmu_foundation_status,termination_endpoints,archived_at,trashed_at,is_test,client_ref";

const txt = (v: unknown, label: string, max = 2000) => str(v, { label, max });
const pic = (v: unknown, label: string): Pic | null => {
  const o = obj(v);
  if (!o.fileId) return null;
  const id = String(o.fileId);
  if (!/^[0-9a-f-]{36}$/i.test(id)) fail(400, "INVALID", `${label}: add the photo again.`);
  return { fileId: id.toLowerCase(), mime: typeof o.mime === "string" ? o.mime.slice(0, 60) : null };
};
const route = (v: unknown, label: string): LatLng[] =>
  list(v, label, 500, (p) => { const ll = toLatLng(p); if (!ll) fail(400, "INVALID", `${label}: a map point is not valid.`); return ll!; });

// a report from the phone, checked field by field (every list has a limit)
export function parseBody(raw: unknown): ReportBody {
  const b = obj(raw);
  const out = emptyBody();
  const crew = obj(b.crew);
  out.crew.workers = num(crew.workers, { label: "Workers", min: 0, max: 2000, int: true });
  out.crew.wageRate = optNum(crew.wageRate, { label: "Daily wage per worker", min: 0, max: 100000 });
  if (out.crew.workers > 0 && out.crew.wageRate === null) fail(400, "INVALID", "Daily wage per worker: enter the wage (₹) for the workers.");
  out.crew.wagesNote = txt(crew.wagesNote, "Wages note", 1000);
  out.crew.ot = list(crew.ot, "Overtime", 30, (g, i) => {
    const o = obj(g);
    return {
      workers: num(o.workers, { label: `Overtime ${i + 1}: workers`, min: 1, max: 2000, int: true, required: true }),
      hours: num(o.hours, { label: `Overtime ${i + 1}: hours`, min: 0.25, max: 24, required: true }),
      rate: num(o.rate, { label: `Overtime ${i + 1}: rate per hour`, min: 0, max: 10000, required: true }),
      note: txt(o.note, `Overtime ${i + 1}: note`, 500),
    };
  });
  out.expenses = list(b.expenses, "Expenses", 100, (e, i) => {
    const o = obj(e);
    return {
      id: str(o.id, { label: "Expense", max: 60 }) || `e${i}`,
      category: oneOf(o.category, EXPENSE_CATEGORIES, `Expense ${i + 1}: kind`),
      amount: num(o.amount, { label: `Expense ${i + 1}: amount`, min: 0.01, max: 10000000, required: true }),
      name: txt(o.name, `Expense ${i + 1}: what`, 120),
      note: txt(o.note, `Expense ${i + 1}: note`, 500),
      bill: pic(o.bill, `Expense ${i + 1}: bill`),
    };
  });
  const seen = new Set<WorkKey>();
  out.work = list(b.work, "Work done", WORK.length, (w) => {
    const o = obj(w);
    const key = oneOf(o.key, WORK.map((x) => x.key), "Work done: kind") as WorkKey;
    if (seen.has(key)) fail(400, "INVALID", "Work done: each kind of work only once.");
    seen.add(key);
    const def = WORK.find((x) => x.key === key)!;
    return {
      key,
      value: num(o.value, { label: def.label, min: 0, max: def.unit === "m" ? 100000 : 10000, int: def.unit === "count" }),
      note: txt(o.note, `${def.label}: note`, 1000),
      photos: list(o.photos, `${def.label}: photos`, 10, (p) => pic(p, `${def.label}: photo`)).filter((p): p is Pic => !!p),
      route: def.route ? route(o.route, `${def.label}: route`) : [],
    };
  });
  if (b.hdd) {
    const h = obj(b.hdd);
    out.hdd = {
      machine: txt(h.machine, "HDD machine", 80), vendor: txt(h.vendor, "HDD vendor", 80), tracker: txt(h.tracker, "Tracker / surveyor", 80),
      operator: txt(h.operator, "HDD operator", 80), ducts: txt(h.ducts, "Ducts / colour", 80),
      rodLengthM: optNum(h.rodLengthM, { label: "Rod length (m)", min: 0.1, max: 20 }),
      rods: list(h.rods, "Rod log", 400, (r, i) => {
        const o = obj(r);
        return {
          no: i + 1,
          pitch: txt(o.pitch, `Rod ${i + 1}: pitch`, 12),
          depth: txt(o.depth, `Rod ${i + 1}: depth`, 12),
          strata: o.strata ? oneOf(o.strata, STRATA, `Rod ${i + 1}: soil`) : "",
          crossing: txt(o.crossing, `Rod ${i + 1}: crossing`, 120),
        };
      }),
    };
    if (out.hdd.rods.length && !out.hdd.rodLengthM) fail(400, "INVALID", "HDD: enter the rod length (m) for the rod log.");
  }
  out.clearances = list(b.clearances, "Permissions", 12, (c, i) => {
    const o = obj(c);
    const agency = str(o.agency, { label: `Permission ${i + 1}: office`, required: true, max: 40 });
    if (!(AGENCIES as readonly string[]).includes(agency) && agency.length < 2) fail(400, "INVALID", `Permission ${i + 1}: name the office.`);
    return {
      agency,
      status: oneOf(o.status, ["none", "applied", "demand_note", "granted"] as ClearanceStatus[], `Permission ${i + 1}: status`),
      note: txt(o.note, `Permission ${i + 1}: note`, 500),
      receipt: pic(o.receipt, `Permission ${i + 1}: receipt`),
    };
  });
  const nt = obj(b.notes);
  out.notes = {
    workDone: txt(nt.workDone, "Work done today", 3000),
    problems: txt(nt.problems, "Problems at site", 2000),
    plans: txt(nt.plans, "Plan for tomorrow", 2000),
    moneyNeeded: optNum(nt.moneyNeeded, { label: "Money needed (₹)", min: 0, max: 10000000 }),
    moneyReason: txt(nt.moneyReason, "Money needed: what for", 1000),
    moneyReceipt: pic(nt.moneyReceipt, "Money needed: receipt"),
    toAdmin: txt(nt.toAdmin, "Message to the admin", 2000),
  };
  if (out.notes.moneyNeeded && !out.notes.moneyReason) fail(400, "INVALID", "Money needed: say what it is for.");
  const sf = obj(b.sentFrom);
  if (sf.lat !== undefined && sf.lng !== undefined) {
    const ll = toLatLng([sf.lat, sf.lng]);
    out.sentFrom = ll ? { lat: ll[0], lng: ll[1], accuracy: optNum(sf.accuracy, { label: "GPS accuracy", min: 0, max: 100000 }) } : null;
  }
  const s = summarize(out);
  const hasAnything = s.workers || s.expenses || s.trenching || s.hdd || s.cableLaying || s.cableMounting || s.joints || s.rmu || s.terminations
    || out.notes.workDone || out.notes.problems || out.clearances.length;
  if (!hasAnything) fail(400, "EMPTY", "The report is empty. Add the crew, the work done or a note about the day.");
  return out;
}

// every photo in the report must be one this person added (and still there)
export async function checkFiles(sb: SupabaseClient, me: Me, body: ReportBody, allowOwner?: string) {
  const ids = fileIdsOf(body);
  if (!ids.length) return ids;
  const found = await rows<{ id: string; owner_id: string; trashed_at: string | null }>(sb.from(T.files).select("id,owner_id,trashed_at").in("id", ids), "the photos");
  const ok = new Set(found.filter((f) => !f.trashed_at && (f.owner_id === me.id || f.owner_id === allowOwner)).map((f) => f.id));
  if (ids.some((id) => !ok.has(id))) fail(400, "INVALID", "A photo in the report is missing. Add it again.");
  return ids;
}

// the stored columns (the ledger adds these up)
export function columnsFor(body: ReportBody, fileIds: string[]) {
  const s = summarize(body);
  const clear: Record<string, { status: string }> = {};
  body.clearances.forEach((c) => (clear[c.agency] = { status: c.status }));
  return {
    labor_count: s.workers,
    ot_hours: Math.round(s.otHours),
    ot_hours_exact: s.otHours,
    calculated_wages: s.wages,
    fuel_expenses: s.fuel,
    travel_expenses: s.travel,
    room_rent: s.room,
    tool_rent: s.tool,
    other_expenses: s.other,
    excavation_length: s.trenching,
    hdd_length: s.hdd,
    cable_laying_length: s.cableLaying,
    cable_mounding_length: s.cableMounting,
    joining_links_completed: Math.round(s.joints),
    rmu_foundation_status: Math.round(s.rmu),
    termination_endpoints: Math.round(s.terminations),
    clearances: clear,
    hdd_drilling_logs: body.hdd?.rods.map((r) => ({ rodNo: r.no, pitch: r.pitch, depth: r.depth, strata: r.strata, crossing: r.crossing })) ?? [],
    hdd_metadata: body.hdd ? { machineName: body.hdd.machine, vendorName: body.hdd.vendor, trackerName: body.hdd.tracker, operatorName: body.hdd.operator, ductsInfo: body.hdd.ducts, rodLengthM: body.hdd.rodLengthM } : {},
    details: { v: 2, body, files: fileIds },
    stock_available: {},
  };
}

export async function projectNames(sb: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const ps = await rows<{ id: string; name: string }>(sb.from(T.projects).select("id,name").in("id", [...new Set(ids)]), "project names");
  return new Map(ps.map((p) => [p.id, p.name]));
}

// may this person open this report?
export async function mayOpenReport(sb: SupabaseClient, me: Me, r: Record<string, unknown>) {
  if (r.is_test !== me.isTest) return false;
  if (me.role === "admin") return true;
  if (me.role === "finance") return r.status === "approved";
  if (me.role === "client") return r.status === "approved" && (await clientProjectIds(sb, me)).includes(String(r.project_id));
  return String(r.supervisor_id) === me.id;
}

export async function loadReport(sb: SupabaseClient, me: Me, id: string): Promise<{ row: Record<string, unknown>; view: ReportView }> {
  const row = await maybe<Record<string, unknown>>(sb.from(T.reports).select("*").eq("id", id).maybeSingle(), "the report");
  if (!row || (row.trashed_at && me.role !== "admin")) fail(404, "NOT_FOUND", "That report doesn't exist.");
  if (!(await mayOpenReport(sb, me, row!))) fail(404, "NOT_FOUND", "That report isn't one you can open.");
  const names = await projectNames(sb, [String(row!.project_id)]);
  let view = normalizeReport(row!, names.get(String(row!.project_id)) ?? null);
  if (me.role === "client") view = forClient(view);
  return { row: row!, view };
}

export function listItem(r: Record<string, unknown>, names: Map<string, string>) {
  const v = normalizeReport({ ...r, details: { v: 2, body: emptyBody() } }, names.get(String(r.project_id)) ?? null);
  const { body: _b, ...rest } = v;
  return { ...rest, fromOldApp: !r.client_ref };
}
