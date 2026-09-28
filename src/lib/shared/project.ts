// A project as every screen sees it. Reads the new columns first and falls back to what the old app
// stored in corridor_data, so the 5 existing projects keep their routes. Nothing is invented: a value
// that isn't stored stays empty.
import { toLatLng, routeLengthM, type LatLng } from "./geo";
import { BASE_TYPES, lineFrom, planFromJson, type ProjectPlan } from "./plan";

export type ProjectStatus = "active" | "paused" | "completed";
export type HddDefaults = { machine?: string; vendor?: string; tracker?: string; operator?: string; ducts?: string; rodLengthM?: number | null };
export type Layer = { key: string; label: string; route: LatLng[] };

export type ProjectView = {
  id: string;
  code: string;
  name: string;
  client: string | null;
  district: string | null;
  location: string | null;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  totalLengthKm: number | null;
  budget: number | null;
  siteRadiusM: number;
  standardWage: number | null;
  hddDefaults: HddDefaults;
  route: LatLng[];
  routeFromOldApp: boolean;
  routeLengthM: number;
  startLabel: string | null;
  endLabel: string | null;
  layers: Layer[];
  plan: ProjectPlan;
  planSaved: boolean;           // false = made from the route and the old app's layers, not saved as a plan yet
  updatedAt: string;
  archivedAt: string | null;
  trashedAt: string | null;
};

export const STATUS_LABEL: Record<ProjectStatus, string> = { active: "Active", paused: "Paused", completed: "Completed" };

// old values on_track / at_risk / delayed were sample statuses from the old app: they are all "active"
export function statusOf(v: unknown): ProjectStatus {
  const s = String(v ?? "");
  if (s === "paused") return "paused";
  if (s === "completed") return "completed";
  return "active";
}

function pts(v: unknown): LatLng[] {
  if (!Array.isArray(v)) return [];
  return v.map(toLatLng).filter((x): x is LatLng => !!x);
}

function oldRoute(c: Record<string, unknown>): LatLng[] {
  const utility = pts(c.utilityPath);
  if (utility.length >= 2) return utility;
  const start = toLatLng(c.startCoords ?? c.startCoordinates);
  const end = toLatLng(c.endCoords ?? c.endCoordinates);
  const mid = pts(c.middlePoints);
  return [start, ...mid, end].filter((x): x is LatLng => !!x);
}

function oldLayer(v: unknown): LatLng[] {
  if (!v || typeof v !== "object") return [];
  const o = v as Record<string, unknown>;
  const start = toLatLng(o.startCoords ?? o.start ?? o.startCoordinates);
  const end = toLatLng(o.endCoords ?? o.end ?? o.endCoordinates);
  return [start, ...pts(o.middlePoints), end].filter((x): x is LatLng => !!x);
}

export function projectFromRow(r: Record<string, unknown>): ProjectView {
  const c = (r.corridor_data && typeof r.corridor_data === "object" ? r.corridor_data : {}) as Record<string, unknown>;
  const newRoute = pts(r.route);
  const route = newRoute.length ? newRoute : oldRoute(c);
  const layers: Layer[] = [];
  const add = (key: string, label: string, v: unknown) => { const p = oldLayer(v); if (p.length >= 2) layers.push({ key, label, route: p }); };
  add("cable", "Cable laying (planned)", c.cableLayingCoords);
  add("hdd", "HDD (planned)", c.hddDrillingCoords);
  add("trench", "Open trench (planned)", c.openTrenchCoords);
  const hd = (r.hdd_defaults && typeof r.hdd_defaults === "object" ? r.hdd_defaults : {}) as HddDefaults;
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  return {
    id: String(r.id),
    code: String(r.code ?? ""),
    name: String(r.name ?? ""),
    client: (r.client_name as string) ?? null,
    district: (r.district as string) ?? null,
    location: (r.location as string) ?? null,
    description: (r.description as string) ?? null,
    status: statusOf(r.status),
    startDate: (r.start_date as string) ?? null,
    endDate: (r.end_date as string) ?? null,
    totalLengthKm: num(r.total_length_km),
    budget: num(r.budget) || null,
    siteRadiusM: Number(r.site_radius_m ?? 300),
    standardWage: num(r.standard_wage),
    hddDefaults: hd,
    route,
    routeFromOldApp: !newRoute.length && route.length > 0,
    routeLengthM: Math.round(routeLengthM(route)),
    startLabel: (r.start_label as string) ?? (typeof c.startLabel === "string" && c.startLabel !== "Start Position" ? c.startLabel : null),
    endLabel: (r.end_label as string) ?? (typeof c.endLabel === "string" && c.endLabel !== "End Position" ? c.endLabel : null),
    layers,
    ...(() => {
      const saved = planFromJson(r.plan);
      if (saved) return { plan: saved, planSaved: true };
      const OLD: Record<string, string> = { cable: "Cable laying", hdd: "HDD", trench: "Open trench" };
      return {
        plan: { route: route.length ? lineFrom(route) : null, parts: layers.map((l, i) => ({ ...lineFrom(l.route), id: `old-${l.key}-${i}`, type: OLD[l.key] ?? l.label, name: "from the old app" })), types: [...BASE_TYPES] },
        planSaved: false,
      };
    })(),
    updatedAt: String(r.updated_at ?? ""),
    archivedAt: (r.archived_at as string) ?? null,
    trashedAt: (r.trashed_at as string) ?? null,
  };
}

// where a person is judged "at site": the route, or the start point if only that is known
export function siteGeometry(p: Pick<ProjectView, "route">): LatLng[] {
  return p.route;
}

export type Totals = {
  reports: number; days: number; firstDay: string | null; lastDay: string | null; workerDays: number; otHours: number;
  wages: number; fuel: number; travel: number; roomRent: number; toolRent: number; other: number; spent: number;
  trenchingM: number; hddM: number; cableLayingM: number; cableMountingM: number; joints: number; rmu: number; terminations: number;
};

// share of the project's length done (cable laid against the total length), when the length is known
export const pct = (doneM: number, totalKm: number | null) => (totalKm ? Math.min(100, Math.round((doneM / (totalKm * 1000)) * 100)) : null);
