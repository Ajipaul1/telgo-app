// A project's work plan on the map (owner's ask, 28 Sep 2026): the whole route (the total work) and its
// work parts by type (Open trench, HDD, Cable laying, or a type the admin writes). Each line keeps the
// points the admin tapped (waypoints) and the drawn line (path: along the roads, or straight). Lengths
// are always measured from the path, never typed; the server measures them again when it saves.
import { routeLengthM, toLatLng, type LatLng } from "./geo";

export type PlanLine = { waypoints: LatLng[]; path: LatLng[]; follow: boolean; lengthM: number };
export type PlanPart = PlanLine & { id: string; type: string; name: string };
export type ProjectPlan = { route: PlanLine | null; parts: PlanPart[]; types: string[] };

export const BASE_TYPES = ["Open trench", "HDD", "Cable laying"];
const PALETTE = ["#0e8a5f", "#c6283f", "#2f6fcb", "#8e44ad", "#16a085", "#d35400"];
export function typeColor(type: string, types: string[] = []): string {
  if (type === "Open trench") return "#e8702a";
  if (type === "HDD") return "#f5b400";
  if (type === "Cable laying") return "#13d3e3";
  const i = Math.max(0, types.filter((t) => !BASE_TYPES.includes(t)).indexOf(type));
  return PALETTE[i % PALETTE.length];
}
// straight lines by default for HDD (a bore goes under roads and drains), along the roads for the rest
export const followsByDefault = (type: string) => type !== "HDD";

export const emptyLine = (follow = true): PlanLine => ({ waypoints: [], path: [], follow, lengthM: 0 });
const sample = (pts: LatLng[], n: number) => pts.length <= n ? pts : Array.from({ length: n }, (_, i) => pts[Math.round((i * (pts.length - 1)) / (n - 1))]);
export const lineFrom = (points: LatLng[], follow = false): PlanLine => ({ waypoints: sample(points, 40), path: points, follow, lengthM: Math.round(routeLengthM(points)) });

export type TypeTotal = { type: string; lengthM: number; parts: number; color: string };
export function planTotals(plan: ProjectPlan) {
  const byType = new Map<string, TypeTotal>();
  for (const p of plan.parts) {
    const t = byType.get(p.type) ?? { type: p.type, lengthM: 0, parts: 0, color: typeColor(p.type, plan.types) };
    t.lengthM += p.lengthM; t.parts += 1;
    byType.set(p.type, t);
  }
  const partsM = plan.parts.reduce((s, p) => s + p.lengthM, 0);
  const routeM = plan.route?.lengthM ?? 0;
  return { routeM, partsM, notPlannedM: Math.max(0, routeM - partsM), types: [...byType.values()] };
}

// a stored plan, read back safely (anything that isn't a valid point is dropped, nothing is invented)
export function planFromJson(v: unknown): ProjectPlan | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const pts = (x: unknown) => (Array.isArray(x) ? x.map(toLatLng).filter((p): p is LatLng => !!p) : []);
  const line = (x: unknown): PlanLine | null => {
    if (!x || typeof x !== "object") return null;
    const l = x as Record<string, unknown>;
    const path = pts(l.path);
    return { waypoints: pts(l.waypoints), path, follow: l.follow !== false, lengthM: Math.round(routeLengthM(path)) };
  };
  const parts = (Array.isArray(o.parts) ? o.parts : []).map((x, i) => {
    const l = line(x);
    const r = (x ?? {}) as Record<string, unknown>;
    return l ? { ...l, id: String(r.id ?? `part-${i + 1}`), type: String(r.type ?? "Other").slice(0, 40), name: String(r.name ?? "").slice(0, 80) } : null;
  }).filter((p): p is PlanPart => !!p);
  const types = (Array.isArray(o.types) ? o.types : []).map((t) => String(t).slice(0, 40)).filter(Boolean);
  return { route: line(o.route), parts, types: [...new Set([...BASE_TYPES, ...types, ...parts.map((p) => p.type)])] };
}
