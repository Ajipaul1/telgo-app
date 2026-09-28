import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { rows } from "@/lib/server/truth";
import { isoDate } from "@/lib/server/validate";
import { projectNames } from "@/lib/server/reports";

const n = (v: unknown) => Number(v ?? 0) || 0;

// day-by-day totals from approved reports (admin, accounts): ?from=&to=&project=
export const GET = api({ roles: ["admin", "finance"] }, async ({ me, sb, req }) => {
  const q = req.nextUrl.searchParams;
  const from = isoDate(q.get("from"), "From");
  const to = isoDate(q.get("to"), "To");
  if (to < from) fail(400, "INVALID", "The end date is before the start date.");
  let query = sb.from(T.ledger).select("*").eq("is_test", me.isTest).gte("report_date", from).lte("report_date", to).order("report_date", { ascending: false });
  if (q.get("project")) query = query.eq("project_id", q.get("project")!);
  const list = await rows<Record<string, unknown>>(query, "the totals");
  const names = await projectNames(sb, list.map((r) => String(r.project_id)));
  const days = list.map((r) => ({
    day: String(r.report_date), projectId: String(r.project_id), projectName: names.get(String(r.project_id)) ?? null, reports: n(r.reports),
    workers: n(r.workers), otHours: n(r.ot_hours), wages: n(r.wages), fuel: n(r.fuel), travel: n(r.travel), roomRent: n(r.room_rent), toolRent: n(r.tool_rent), other: n(r.other),
    trenchingM: n(r.trenching_m), hddM: n(r.hdd_m), cableLayingM: n(r.cable_laying_m), cableMountingM: n(r.cable_mounting_m), joints: n(r.joints), rmu: n(r.rmu_foundations), terminations: n(r.terminations),
  }));
  const keys = ["reports", "workers", "otHours", "wages", "fuel", "travel", "roomRent", "toolRent", "other", "trenchingM", "hddM", "cableLayingM", "cableMountingM", "joints", "rmu", "terminations"] as const;
  const total = Object.fromEntries(keys.map((k) => [k, Math.round(days.reduce((a, d) => a + d[k], 0) * 100) / 100])) as Record<(typeof keys)[number], number>;
  return { from, to, days, total: { ...total, spent: Math.round((total.wages + total.fuel + total.travel + total.roomRent + total.toolRent + total.other) * 100) / 100 } };
});
