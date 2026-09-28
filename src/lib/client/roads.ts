"use client";
// "Follow the roads" (owner's ask): the line between two tapped points goes along the road, and its length
// is measured along it. Google's Routes service when the map key allows it; otherwise the free
// OpenStreetMap road router (routing.openstreetmap.de, walking roads so one-way streets don't make
// detours); if neither answers, a straight line, and the screen says so. Answers are remembered.
import type { LatLng } from "@/lib/shared/geo";
import { routeLengthM } from "@/lib/shared/geo";

export type Piece = { path: LatLng[]; how: "road" | "straight" };
type G = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const cache = new Map<string, Promise<Piece>>();
let googleRoutes: "unknown" | "yes" | "no" = "unknown";
const round6 = (p: LatLng): LatLng => [Math.round(p[0] * 1e6) / 1e6, Math.round(p[1] * 1e6) / 1e6];
const straight = (a: LatLng, b: LatLng): Piece => ({ path: [a, b], how: "straight" });

async function viaGoogle(a: LatLng, b: LatLng): Promise<LatLng[] | null> {
  const w = window as unknown as { google?: G };
  if (googleRoutes === "no" || !w.google?.maps?.importLibrary) return null;
  try {
    const { Route } = await w.google.maps.importLibrary("routes");
    const r = await Route.computeRoutes({ origin: { lat: a[0], lng: a[1] }, destination: { lat: b[0], lng: b[1] }, travelMode: "WALKING", fields: ["path"] });
    const path = (r.routes?.[0]?.path ?? []).map((p: G) => [typeof p.lat === "function" ? p.lat() : p.lat, typeof p.lng === "function" ? p.lng() : p.lng] as LatLng);
    googleRoutes = "yes";
    return path.length > 1 ? path : null;
  } catch (e) {
    // the key doesn't allow the Routes service: stop asking Google this session
    if (/PERMISSION_DENIED|REQUEST_DENIED|blocked|not authorized/i.test(String((e as Error)?.message ?? e))) googleRoutes = "no";
    return null;
  }
}

async function viaOsm(a: LatLng, b: LatLng): Promise<LatLng[] | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`;
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    const j = await r.json();
    const coords: [number, number][] = j?.routes?.[0]?.geometry?.coordinates ?? [];
    return coords.length > 1 ? coords.map(([lng, lat]) => [lat, lng] as LatLng) : null;
  } catch { return null; } finally { clearTimeout(t); }
}

export function roadPiece(a: LatLng, b: LatLng): Promise<Piece> {
  const key = `${a[0].toFixed(6)},${a[1].toFixed(6)}>${b[0].toFixed(6)},${b[1].toFixed(6)}`;
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      const path = (await viaGoogle(a, b)) ?? (await viaOsm(a, b));
      if (!path) return straight(a, b);
      // the road starts and ends where the person tapped (the router snaps to the nearest road)
      const full = [a, ...path.map(round6), b];
      // a road detour more than 4× the straight distance is not a route along this road: draw straight
      if (routeLengthM(full) > 4 * routeLengthM([a, b]) + 200) return straight(a, b);
      return { path: full, how: "road" as const };
    })();
    cache.set(key, p);
    p.then((x) => { if (x.how === "straight") cache.delete(key); }); // try the road again next time
  }
  return p;
}

// fewer points, same line: drops points within `tol` metres of the line (Douglas-Peucker, on a local flat grid)
export function simplify(path: LatLng[], tol = 2): LatLng[] {
  if (path.length < 3) return path;
  const lat0 = path[0][0] * Math.PI / 180;
  const xy = path.map(([la, lo]) => [lo * 111320 * Math.cos(lat0), la * 110540]);
  const keep = new Uint8Array(path.length); keep[0] = 1; keep[path.length - 1] = 1;
  const stack: [number, number][] = [[0, path.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = xy[a], [bx, by] = xy[b];
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
    let far = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const t = Math.max(0, Math.min(1, ((xy[i][0] - ax) * dx + (xy[i][1] - ay) * dy) / len2));
      const d = Math.hypot(xy[i][0] - (ax + t * dx), xy[i][1] - (ay + t * dy));
      if (d > far) { far = d; idx = i; }
    }
    if (far > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return path.filter((_, i) => keep[i]);
}

// the whole line through the tapped points: along the roads (follow) or straight
export async function drawLine(waypoints: LatLng[], follow: boolean): Promise<{ path: LatLng[]; straightPieces: number }> {
  if (waypoints.length < 2) return { path: [...waypoints], straightPieces: 0 };
  if (!follow) return { path: [...waypoints], straightPieces: 0 };
  const pieces = await Promise.all(waypoints.slice(1).map((b, i) => roadPiece(waypoints[i], b)));
  const path: LatLng[] = [];
  pieces.forEach((pc, i) => path.push(...(i === 0 ? pc.path : pc.path.slice(1))));
  return { path: simplify(path), straightPieces: pieces.filter((pc) => pc.how === "straight").length };
}
