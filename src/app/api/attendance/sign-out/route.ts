import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail, logProblem } from "@/lib/server/doctor";
import { rows, maybe } from "@/lib/server/truth";
import { lat, lng, optNum, optStr } from "@/lib/server/validate";
import { ATT_COLS, judge, projectForSite } from "@/lib/server/attendance";
import { shiftsFromRows } from "@/lib/shared/attendance";

// sign out: closes my open shift. With no location (GPS off or failed) it is recorded as "no location",
// never with a made-up position.
export const POST = api({ roles: ["supervisor", "engineer", "finance"], rate: { limit: 20, seconds: 600 } }, async ({ me, sb, body }) => {
  const open = await maybe<Record<string, unknown>>(
    sb.from(T.attendance).select(ATT_COLS).eq("mobile_user_id", me.id).eq("status", "signed_in").is("check_out_at", null).maybeSingle(),
    "your shift",
  );
  if (!open) fail(409, "NOT_IN", "You aren't signed in, so there is nothing to sign out of.");
  const hasGps = body.lat !== undefined && body.lat !== null && body.lng !== undefined && body.lng !== null;
  const patch: Record<string, unknown> = {
    check_out_at: new Date().toISOString(),
    status: "signed_out",
    closed_how: hasGps ? "signed_out" : "signed_out_no_location",
    note: optStr(body.note, { label: "Note", max: 500 }),
  };
  let within: boolean | null = null, distance: number | null = null;
  if (hasGps) {
    const at: [number, number] = [lat(body.lat), lng(body.lng)];
    const p = await projectForSite(sb, String(open!.project_id), me.isTest).catch(() => null);
    const j = p ? judge(p, at) : { distance: null, within: false, known: false };
    distance = j.distance; within = j.known ? j.within : null;
    Object.assign(patch, { check_out_lat: at[0], check_out_lng: at[1], check_out_accuracy_m: optNum(body.accuracy, { label: "GPS accuracy", min: 0, max: 100000 }), check_out_distance_m: distance, check_out_within: within });
  }
  const done = await rows<Record<string, unknown>>(
    sb.from(T.attendance).update(patch).eq("id", open!.id).eq("status", "signed_in").is("check_out_at", null).select(ATT_COLS),
    "your sign-out",
  );
  if (!done.length) fail(409, "CHANGED", "Your shift was already closed (on another phone?). Reload to see it.");
  if (hasGps) {
    // unconfirmed-ok: the sign-out itself is confirmed above; a missing map point is logged, not hidden
    const { error: locErr } = await sb.from(T.locations).insert({
      mobile_user_id: me.id, attendance_id: open!.id, user_name: me.fullName, user_login_id: me.loginId, user_role: me.role,
      project_id: open!.project_id, project_name: open!.project_name, latitude: patch.check_out_lat, longitude: patch.check_out_lng,
      gps_accuracy_m: patch.check_out_accuracy_m ?? null, distance_from_site_m: distance, within_geofence: !!within, source: "sign_out",
    });
    if (locErr) await logProblem({ error: locErr, route: "sign-out map point", userId: me.id, isTest: me.isTest });
  }
  return { shift: shiftsFromRows(done)[0] };
});
