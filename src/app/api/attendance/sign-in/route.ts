import { api } from "@/lib/server/api";
import { fail, fromDb } from "@/lib/server/doctor";
import { str, lat, lng, optNum, optStr } from "@/lib/server/validate";
import { judge, projectForSite } from "@/lib/server/attendance";
import { shiftsFromRows } from "@/lib/shared/attendance";

// sign in at a site with the phone's location; the server measures the distance to the project's route
export const POST = api({ roles: ["supervisor", "engineer", "finance"], rate: { limit: 20, seconds: 600 } }, async ({ me, sb, body }) => {
  const projectId = str(body.projectId, { label: "Project", required: true, max: 80 });
  const at: [number, number] = [lat(body.lat), lng(body.lng)];
  const accuracy = optNum(body.accuracy, { label: "GPS accuracy", min: 0, max: 100000 });
  if (accuracy !== null && accuracy > 2000) fail(400, "GPS_ROUGH", `Your phone's location is too rough (±${Math.round(accuracy / 1000)} km). Turn on precise location, step outside and try again.`);
  const ref = optStr(body.ref, { label: "Reference", max: 80 });
  const p = await projectForSite(sb, projectId, me.isTest);
  const j = judge(p, at);
  const { data, error } = await sb.rpc("telgo_sign_in", {
    p_actor: me.id, p_project: p.id, p_lat: at[0], p_lng: at[1], p_acc: accuracy, p_dist: j.distance, p_within: j.within, p_ref: ref,
  });
  if (error) throw fromDb(error, "your sign-in");
  const row = data as Record<string, unknown>;
  const shift = shiftsFromRows([row])[0];
  return { shift, siteKnown: j.known, siteRadiusM: p.siteRadiusM, repeat: !!row.repeat };
});
