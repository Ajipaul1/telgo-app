// Distances on the ground, in metres.
export type LatLng = [number, number];

export function distanceM(a: LatLng, b: LatLng) {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function routeLengthM(route: LatLng[]) {
  let m = 0;
  for (let i = 1; i < route.length; i++) m += distanceM(route[i - 1], route[i]);
  return m;
}

// shortest distance from a point to a line of points (flat-earth maths is exact enough at site scale)
export function distanceToRouteM(p: LatLng, route: LatLng[]) {
  if (!route.length) return null;
  if (route.length === 1) return distanceM(p, route[0]);
  const k = Math.cos((p[0] * Math.PI) / 180) * 111320;
  const toXY = (q: LatLng) => [q[1] * k, q[0] * 110540] as const;
  const [px, py] = toXY(p);
  let best = Infinity;
  for (let i = 1; i < route.length; i++) {
    const [ax, ay] = toXY(route[i - 1]);
    const [bx, by] = toXY(route[i]);
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    const cx = ax + t * dx, cy = ay + t * dy;
    best = Math.min(best, Math.hypot(px - cx, py - cy));
  }
  return best;
}

// a [lat, lng] pair from anything the old app stored ([lat,lng], [lng,lat], {lat,lng})
export function toLatLng(v: unknown): LatLng | null {
  let a: number, b: number;
  if (Array.isArray(v) && v.length >= 2) { a = Number(v[0]); b = Number(v[1]); }
  else if (v && typeof v === "object" && "lat" in v) { a = Number((v as { lat: unknown }).lat); b = Number((v as { lng?: unknown; lon?: unknown }).lng ?? (v as { lon?: unknown }).lon); }
  else return null;
  if (!Number.isFinite(a) || !Number.isFinite(b) || (a === 0 && b === 0)) return null;
  // India: latitude 6-37, longitude 68-98. These don't overlap, so a swapped pair is easy to see.
  if (a >= 68 && a <= 98 && b >= 6 && b <= 37) return [b, a];
  if (Math.abs(a) > 90) return [b, a];
  return [a, b];
}
