import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { rows } from "@/lib/server/truth";
import { ATT_COLS } from "@/lib/server/attendance";
import { shiftsFromRows } from "@/lib/shared/attendance";
import { istToday } from "@/lib/shared/format";
import { projectFromRow } from "@/lib/shared/project";

// the live map: every site person, today's shift, and where their phone last said they were today.
// A person with no location today is listed as such; no position is ever guessed.
export const GET = api({ roles: ["admin"] }, async ({ me, sb }) => {
  await sb.rpc("telgo_close_stale_shifts", { p_user: null });
  const dayStart = istToday() + "T00:00:00+05:30";
  const [people, att, locs, projects] = await Promise.all([
    rows<{ id: string; full_name: string; role: string; login_id: string; avatar_file_id: string | null; avatar_url: string | null }>(
      sb.from(T.users).select("id,full_name,role,login_id,avatar_file_id,avatar_url").in("role", ["supervisor", "engineer", "finance"])
        .eq("access_status", "active").is("blocked_at", null).is("archived_at", null).eq("is_test", me.isTest).order("full_name"),
      "the team"),
    rows<Record<string, unknown>>(sb.from(T.attendance).select(ATT_COLS).gte("check_in_at", dayStart).eq("is_test", me.isTest).is("trashed_at", null).order("check_in_at").limit(3000), "today's attendance"),
    rows<{ mobile_user_id: string; latitude: number; longitude: number; gps_accuracy_m: number | null; recorded_at: string; source: string; project_name: string; distance_from_site_m: number | null; within_geofence: boolean }>(
      sb.from(T.locations).select("mobile_user_id,latitude,longitude,gps_accuracy_m,recorded_at,source,project_name,distance_from_site_m,within_geofence")
        .gte("recorded_at", dayStart).eq("is_test", me.isTest).order("recorded_at", { ascending: false }).limit(5000),
      "today's locations"),
    rows<Record<string, unknown>>(sb.from(T.projects).select("*").eq("is_test", me.isTest).is("trashed_at", null).is("archived_at", null), "the projects"),
  ]);
  const shifts = shiftsFromRows(att);
  const last = new Map<string, (typeof locs)[number]>();
  for (const l of locs) if (!last.has(l.mobile_user_id)) last.set(l.mobile_user_id, l);
  return {
    day: istToday(),
    people: people.map((p) => {
      const mine = shifts.filter((s) => s.userId === p.id);
      const l = last.get(p.id);
      return {
        id: p.id, fullName: p.full_name, role: p.role, loginId: p.login_id, hasAvatar: !!(p.avatar_file_id || p.avatar_url),
        shift: mine[0] ?? null,
        shiftsToday: mine.length,
        last: l ? { lat: Number(l.latitude), lng: Number(l.longitude), accuracyM: l.gps_accuracy_m === null ? null : Number(l.gps_accuracy_m), at: l.recorded_at, source: l.source, projectName: l.project_name, distanceM: l.distance_from_site_m === null ? null : Number(l.distance_from_site_m), within: l.within_geofence } : null,
      };
    }),
    sites: projects.map(projectFromRow).filter((p) => p.route.length).map((p) => ({ id: p.id, name: p.name, route: p.route, radiusM: p.siteRadiusM })),
  };
});
