import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { T } from "./core";
import { fail } from "./doctor";
import { rows } from "./truth";
import { str, optStr, optNum, num, oneOf, isoDate, list } from "./validate";
import type { Me } from "./session";
import { projectFromRow, type ProjectView, type Totals } from "@/lib/shared/project";
export type { Totals };
import { toLatLng, type LatLng } from "@/lib/shared/geo";


const n = (v: unknown) => Number(v ?? 0) || 0;
export function totalsFromRow(r: Record<string, unknown> | undefined): Totals {
  const t = {
    reports: n(r?.reports), days: n(r?.days), firstDay: (r?.first_day as string) ?? null, lastDay: (r?.last_day as string) ?? null,
    workerDays: n(r?.worker_days), otHours: n(r?.ot_hours), wages: n(r?.wages), fuel: n(r?.fuel), travel: n(r?.travel),
    roomRent: n(r?.room_rent), toolRent: n(r?.tool_rent), other: n(r?.other), spent: 0,
    trenchingM: n(r?.trenching_m), hddM: n(r?.hdd_m), cableLayingM: n(r?.cable_laying_m), cableMountingM: n(r?.cable_mounting_m),
    joints: n(r?.joints), rmu: n(r?.rmu_foundations), terminations: n(r?.terminations),
  };
  t.spent = Math.round((t.wages + t.fuel + t.travel + t.roomRent + t.toolRent + t.other) * 100) / 100;
  return t;
}

// the project ids a client may see
export async function clientProjectIds(sb: SupabaseClient, me: Me) {
  const a = await rows<{ project_id: string }>(sb.from(T.projectAccess).select("project_id").eq("user_id", me.id).is("revoked_at", null), "your projects");
  return a.map((x) => x.project_id);
}

export async function listProjects(sb: SupabaseClient, me: Me, opts: { includeArchived?: boolean } = {}) {
  let q = sb.from(T.projects).select("*").eq("is_test", me.isTest).is("trashed_at", null).order("name");
  if (!opts.includeArchived) q = q.is("archived_at", null);
  if (me.role === "client") {
    const ids = await clientProjectIds(sb, me);
    if (!ids.length) return [];
    q = q.in("id", ids);
  }
  const list = (await rows<Record<string, unknown>>(q, "the projects")).map(projectFromRow);
  if (!list.length) return [];
  const totals = await rows<Record<string, unknown>>(sb.from(T.projectTotals).select("*").eq("is_test", me.isTest).in("project_id", list.map((p) => p.id)), "project totals");
  const byId = new Map(totals.map((t) => [String(t.project_id), t]));
  const money = me.role === "admin" || me.role === "finance";
  return list.map((p) => {
    const t = totalsFromRow(byId.get(p.id));
    return { ...p, budget: money ? p.budget : null, standardWage: money || me.role === "supervisor" || me.role === "engineer" ? p.standardWage : null, totals: money ? t : { ...t, wages: 0, fuel: 0, travel: 0, roomRent: 0, toolRent: 0, other: 0, spent: 0 } };
  });
}
export type ProjectWithTotals = ProjectView & { totals: Totals };

function routeOf(v: unknown): LatLng[] {
  return list(v, "Route", 2000, (p) => {
    const ll = toLatLng(p);
    if (!ll) fail(400, "INVALID", "Route: a point on the map is not valid.");
    return [Math.round(ll![0] * 1e6) / 1e6, Math.round(ll![1] * 1e6) / 1e6] as LatLng;
  });
}

// the columns an admin sets, checked
export function projectPatch(b: Record<string, unknown>, creating: boolean) {
  const p: Record<string, unknown> = {};
  const has = (k: string) => creating || b[k] !== undefined;
  if (has("name")) p.name = str(b.name, { label: "Project name", required: true, min: 2, max: 120 });
  if (has("code")) p.code = str(b.code, { label: "Project code", required: true, min: 2, max: 40, pattern: /^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/, patternMsg: "Project code: letters, digits, - . / only." }).toUpperCase();
  if (has("client")) p.client_name = optStr(b.client, { label: "Client", max: 120 });
  if (has("district")) p.district = optStr(b.district, { label: "District", max: 60 });
  if (has("location") || has("district")) p.location = str(b.location ?? b.district ?? "", { label: "Place", required: true, max: 160 });
  if (has("description")) p.description = optStr(b.description, { label: "About the work", max: 2000 });
  if (has("status")) p.status = oneOf(b.status ?? "active", ["active", "paused", "completed"] as const, "Status");
  if (has("startDate")) p.start_date = b.startDate ? isoDate(b.startDate, "Start date") : null;
  if (has("endDate")) p.end_date = b.endDate ? isoDate(b.endDate, "Planned finish") : null;
  if (has("totalLengthKm")) p.total_length_km = optNum(b.totalLengthKm, { label: "Total length (km)", min: 0, max: 5000 });
  if (has("budget")) p.budget = optNum(b.budget, { label: "Budget (₹)", min: 0, max: 1e11 }) ?? 0;
  if (has("siteRadiusM")) p.site_radius_m = num(b.siteRadiusM ?? 300, { label: "Site area", min: 25, max: 20000, int: true });
  if (has("standardWage")) p.standard_wage = optNum(b.standardWage, { label: "Standard daily wage (₹)", min: 0, max: 100000 });
  if (has("startLabel")) p.start_label = optStr(b.startLabel, { label: "Start point name", max: 120 });
  if (has("endLabel")) p.end_label = optStr(b.endLabel, { label: "End point name", max: 120 });
  if (has("route")) p.route = routeOf(b.route ?? []);
  if (has("hddDefaults")) {
    const h = (b.hddDefaults && typeof b.hddDefaults === "object" ? b.hddDefaults : {}) as Record<string, unknown>;
    p.hdd_defaults = {
      machine: optStr(h.machine, { label: "HDD machine", max: 80 }) ?? "",
      vendor: optStr(h.vendor, { label: "HDD vendor", max: 80 }) ?? "",
      tracker: optStr(h.tracker, { label: "Tracker / surveyor", max: 80 }) ?? "",
      operator: optStr(h.operator, { label: "HDD operator", max: 80 }) ?? "",
      ducts: optStr(h.ducts, { label: "Ducts / colour", max: 80 }) ?? "",
      rodLengthM: optNum(h.rodLengthM, { label: "Rod length (m)", min: 0.1, max: 20 }),
    };
  }
  // the old app's site point: kept in step with the start of the route
  const r = p.route as LatLng[] | undefined;
  if (r && r.length) { p.latitude = r[0][0]; p.longitude = r[0][1]; }
  return p;
}
