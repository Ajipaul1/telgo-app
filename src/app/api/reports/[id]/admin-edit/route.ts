import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail, fromDb } from "@/lib/server/doctor";
import { maybe } from "@/lib/server/truth";
import { num, obj, stamp, str, uuid } from "@/lib/server/validate";
import { loadReport, projectNames } from "@/lib/server/reports";
import { normalizeReport } from "@/lib/shared/report";

const NUMS: [string, string, boolean][] = [
  ["labor_count", "Workers", true], ["ot_hours_exact", "Overtime worker-hours", false], ["calculated_wages", "Wages (₹)", false],
  ["fuel_expenses", "Fuel (₹)", false], ["travel_expenses", "Travel (₹)", false], ["room_rent", "Room rent (₹)", false],
  ["tool_rent", "Tool rent (₹)", false], ["other_expenses", "Other (₹)", false], ["excavation_length", "Trenching (m)", false],
  ["hdd_length", "HDD (m)", false], ["cable_laying_length", "Cable laying (m)", false], ["cable_mounding_length", "Cable mounting (m)", false],
  ["joining_links_completed", "Joints", true], ["rmu_foundation_status", "RMU foundations", true], ["termination_endpoints", "Terminations", true],
];

// the admin corrects a report's numbers or moves it to the right project, with a reason (also allowed
// on an approved report). The reason is written on the report and the change log keeps before and after.
export const POST = api({ roles: ["admin"], rate: { limit: 60, seconds: 600 } }, async ({ me, sb, params, body }) => {
  const id = uuid(params.id, "Report");
  const expected = stamp(body.expected);
  const reason = str(body.reason, { label: "Why it is changed", required: true, min: 3, max: 500 });
  await loadReport(sb, me, id);
  const raw = obj(body.patch);
  const patch: Record<string, unknown> = {};
  for (const [col, label, int] of NUMS) if (raw[col] !== undefined && raw[col] !== "") patch[col] = num(raw[col], { label, min: 0, max: 1e9, int });
  if (raw.project_id) {
    const pid = str(raw.project_id, { label: "Project", max: 80 });
    const p = await maybe(sb.from(T.projects).select("id").eq("id", pid).eq("is_test", me.isTest).is("trashed_at", null).maybeSingle(), "the project");
    if (!p) fail(400, "INVALID", "Project: choose one of the projects.");
    patch.project_id = pid;
  }
  if (!Object.keys(patch).length) fail(400, "INVALID", "Nothing to change.");
  const { data, error } = await sb.rpc("telgo_report_admin_edit", { p_report: id, p_actor: me.id, p_expected: expected, p_patch: patch, p_reason: reason });
  if (error) throw fromDb(error, "the correction");
  const row = data as Record<string, unknown>;
  const names = await projectNames(sb, [String(row.project_id)]);
  return { report: normalizeReport(row, names.get(String(row.project_id)) ?? null) };
});
