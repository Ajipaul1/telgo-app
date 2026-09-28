import { api, json } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { maybe } from "@/lib/server/truth";
import { lat, lng, optNum } from "@/lib/server/validate";
import { judge, projectForSite } from "@/lib/server/attendance";

// while signed in and the app is open, the phone sends where it is every few minutes (the live map).
// Only during a shift; at most one point every 2 minutes; no notification.
export const POST = api({ roles: ["supervisor", "engineer", "finance"], rate: { limit: 60, seconds: 3600 } }, async ({ me, sb, body }) => {
  const open = await maybe<{ id: string; project_id: string; project_name: string }>(
    sb.from(T.attendance).select("id,project_id,project_name").eq("mobile_user_id", me.id).eq("status", "signed_in").is("check_out_at", null).maybeSingle(),
    "your shift",
  );
  if (!open) return json({ saved: false, reason: "not_signed_in" });
  const last = await maybe<{ recorded_at: string }>(
    sb.from(T.locations).select("recorded_at").eq("mobile_user_id", me.id).order("recorded_at", { ascending: false }).limit(1).maybeSingle(), "your last location");
  if (last && Date.now() - Date.parse(last.recorded_at) < 110e3) return json({ saved: false, reason: "too_soon" });
  const at: [number, number] = [lat(body.lat), lng(body.lng)];
  const accuracy = optNum(body.accuracy, { label: "GPS accuracy", min: 0, max: 100000 });
  const p = await projectForSite(sb, open.project_id, me.isTest).catch(() => null);
  const j = p ? judge(p, at) : { distance: null, within: false };
  const { data, error } = await sb.from(T.locations).insert({
    mobile_user_id: me.id, attendance_id: open.id, user_name: me.fullName, user_login_id: me.loginId, user_role: me.role,
    project_id: open.project_id, project_name: open.project_name, latitude: at[0], longitude: at[1], gps_accuracy_m: accuracy,
    distance_from_site_m: j.distance, within_geofence: j.within, source: "ping",
  }).select("recorded_at").single();
  if (error) throw error;
  return { saved: true, at: data.recorded_at };
});
