import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { rows } from "@/lib/server/truth";
import { isoDate, uuid } from "@/lib/server/validate";
import { addDays } from "@/lib/shared/format";

// where one person's phone was on one day (sign-in, pings while the app was open, sign-out)
export const GET = api({ roles: ["admin"] }, async ({ me, sb, req }) => {
  const q = req.nextUrl.searchParams;
  const user = uuid(q.get("user"), "Person");
  const day = isoDate(q.get("day"), "Day");
  const points = await rows<Record<string, unknown>>(
    sb.from(T.locations).select("latitude,longitude,gps_accuracy_m,recorded_at,source,project_name,distance_from_site_m,within_geofence")
      .eq("mobile_user_id", user).eq("is_test", me.isTest)
      .gte("recorded_at", day + "T00:00:00+05:30").lt("recorded_at", addDays(day, 1) + "T00:00:00+05:30")
      .order("recorded_at").limit(2000),
    "the trail",
  );
  return {
    points: points.map((p) => ({
      lat: Number(p.latitude), lng: Number(p.longitude), accuracyM: p.gps_accuracy_m === null ? null : Number(p.gps_accuracy_m),
      at: p.recorded_at, source: p.source, projectName: p.project_name,
      distanceM: p.distance_from_site_m === null ? null : Number(p.distance_from_site_m), within: p.within_geofence,
    })),
  };
});
