// Shifts (sign in ... sign out) from attendance rows.
// New rows are one row per shift. The old app wrote a new row for every mark (and for every GPS
// fix), with sign-out as its own "checked_out" row; those are grouped per person per day into one
// shift: the first mark is the sign-in, the last "checked_out" after it is the sign-out.
import { istDate } from "./format";

export type Shift = {
  id: string;
  userId: string;
  userName: string;
  role: string;
  projectId: string;
  projectName: string;
  day: string;                 // India date of the sign-in
  inAt: string;
  outAt: string | null;
  inLat: number | null; inLng: number | null; inAccuracyM: number | null;
  inDistanceM: number | null; inWithin: boolean | null;
  outLat: number | null; outLng: number | null; outDistanceM: number | null; outWithin: boolean | null;
  state: "open" | "closed" | "not_signed_out";
  fromOldApp: boolean;
  marks: number;               // old app: how many rows were grouped
  note: string | null;
  closedHow: string | null;     // signed_out | signed_out_no_location | auto_12h | not_signed_out
};

const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

export function shiftsFromRows(rows: Record<string, unknown>[], today = istDate()): Shift[] {
  const out: Shift[] = [];
  const old = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) {
    const status = String(r.status ?? "");
    if (["signed_in", "signed_out", "missed_sign_out"].includes(status)) {
      const day = istDate(String(r.check_in_at));
      out.push({
        id: String(r.id), userId: String(r.mobile_user_id), userName: String(r.user_name ?? ""), role: String(r.user_role ?? ""),
        projectId: String(r.project_id ?? ""), projectName: String(r.project_name ?? ""), day,
        inAt: String(r.check_in_at), outAt: (r.check_out_at as string) ?? null,
        inLat: num(r.latitude), inLng: num(r.longitude), inAccuracyM: num(r.gps_accuracy_m), inDistanceM: num(r.distance_from_site_m), inWithin: r.distance_from_site_m === null || r.distance_from_site_m === undefined ? null : !!r.within_geofence,
        outLat: num(r.check_out_lat), outLng: num(r.check_out_lng), outDistanceM: num(r.check_out_distance_m), outWithin: (r.check_out_within as boolean) ?? null,
        state: r.check_out_at ? "closed" : status === "missed_sign_out" || day < today ? "not_signed_out" : "open",
        fromOldApp: false, marks: 1, note: (r.note as string) ?? null, closedHow: (r.closed_how as string) ?? null,
      });
    } else {
      const key = `${r.mobile_user_id}|${istDate(String(r.check_in_at))}`;
      old.set(key, [...(old.get(key) ?? []), r]);
    }
  }
  for (const [, list] of old) {
    list.sort((a, b) => Date.parse(String(a.check_in_at)) - Date.parse(String(b.check_in_at)));
    const first = list.find((r) => r.status !== "checked_out") ?? list[0];
    const outs = list.filter((r) => r.status === "checked_out" && Date.parse(String(r.check_in_at)) >= Date.parse(String(first.check_in_at)));
    const last = outs[outs.length - 1];
    const day = istDate(String(first.check_in_at));
    out.push({
      id: String(first.id), userId: String(first.mobile_user_id), userName: String(first.user_name ?? ""), role: String(first.user_role ?? ""),
      projectId: String(first.project_id ?? ""), projectName: String(first.project_name ?? ""), day,
      inAt: String(first.check_in_at), outAt: last ? String(last.check_in_at) : null,
      // the old app measured distance to a sample project's point, so its distances mean nothing: not shown
      inLat: num(first.latitude), inLng: num(first.longitude), inAccuracyM: num(first.gps_accuracy_m), inDistanceM: null, inWithin: null,
      outLat: last ? num(last.latitude) : null, outLng: last ? num(last.longitude) : null, outDistanceM: null, outWithin: null,
      state: last ? "closed" : day < today ? "not_signed_out" : "open",
      fromOldApp: true, marks: list.length, note: null, closedHow: null,
    });
  }
  return out.sort((a, b) => Date.parse(b.inAt) - Date.parse(a.inAt));
}
