import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail, fromDb } from "@/lib/server/doctor";
import { maybe } from "@/lib/server/truth";
import { oneOf, optStr, stamp, str, uuid } from "@/lib/server/validate";
import { loadReport, projectNames } from "@/lib/server/reports";
import { normalizeReport } from "@/lib/shared/report";

// the admin approves a report, or asks its supervisor to fix something. Approving twice is refused,
// and totals come from approved reports themselves, so nothing is ever counted twice.
export const POST = api({ roles: ["admin"], rate: { limit: 120, seconds: 600 } }, async ({ me, sb, params, body }) => {
  const id = uuid(params.id, "Report");
  const action = oneOf(body.action, ["approve", "ask_fix"] as const, "Action");
  const expected = stamp(body.expected);
  const { row } = await loadReport(sb, me, id);
  const names = await projectNames(sb, [String(row.project_id)]);
  if (action === "approve") {
    if (row.status === "approved") fail(409, "ALREADY_APPROVED", "This report is already approved.");
    if (!names.get(String(row.project_id))) fail(409, "NO_PROJECT", "This report points at a project that doesn't exist (a sample project of the old app). Move it to the right project first (Correct the numbers → Project).");
    const { data, error } = await sb.from(T.reports).update({ status: "approved", approved_at: new Date().toISOString(), approved_by: me.id, approved_by_name: me.fullName })
      .eq("id", id).eq("updated_at", expected).neq("status", "approved").select("*");
    if (error) throw fromDb(error, "the approval");
    if (!data?.length) {
      const now = await maybe<{ status: string }>(sb.from(T.reports).select("status").eq("id", id).maybeSingle(), "the report");
      fail(409, now?.status === "approved" ? "ALREADY_APPROVED" : "CHANGED", now?.status === "approved" ? "This report was already approved (by someone else just now)." : "This report changed since you opened it. Nothing was saved. Reload to see it.");
    }
    return { report: normalizeReport(data![0] as Record<string, unknown>, names.get(String(row.project_id)) ?? null) };
  }
  const message = str(body.message, { label: "What needs fixing", required: true, min: 3, max: 2000 });
  const { data, error } = await sb.rpc("telgo_report_ask_fix", { p_report: id, p_actor: me.id, p_expected: expected, p_message: message, p_item: optStr(body.item, { label: "About", max: 40 }) });
  if (error) throw fromDb(error, "your request to fix");
  return { report: normalizeReport(data as Record<string, unknown>, names.get(String(row.project_id)) ?? null) };
});
