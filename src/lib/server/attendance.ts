import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { T } from "./core";
import { fail } from "./doctor";
import { maybe } from "./truth";
import { projectFromRow, type ProjectView } from "@/lib/shared/project";
import { distanceToRouteM, type LatLng } from "@/lib/shared/geo";

export const ATT_COLS = "id,mobile_user_id,user_name,user_role,project_id,project_name,check_in_at,check_out_at,latitude,longitude,gps_accuracy_m,distance_from_site_m,within_geofence,status,check_out_lat,check_out_lng,check_out_distance_m,check_out_within,closed_how,note,updated_at";

export async function projectForSite(sb: SupabaseClient, id: string, isTest: boolean): Promise<ProjectView> {
  const r = await maybe<Record<string, unknown>>(sb.from(T.projects).select("*").eq("id", id).eq("is_test", isTest).is("trashed_at", null).maybeSingle(), "the project");
  if (!r) fail(400, "INVALID", "Project: choose one of the projects.");
  return projectFromRow(r!);
}

// how far from the site (the project's route on the map), and whether that is inside its site area
export function judge(p: ProjectView, at: LatLng) {
  const d = distanceToRouteM(at, p.route);
  if (d === null) return { distance: null as number | null, within: false, known: false };
  const distance = Math.round(d);
  return { distance, within: distance <= p.siteRadiusM, known: true };
}
