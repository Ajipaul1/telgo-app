import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { rows } from "@/lib/server/truth";
import { stamp, uuid } from "@/lib/server/validate";
import { checkFiles, columnsFor, loadReport, parseBody, projectNames } from "@/lib/server/reports";
import { normalizeReport } from "@/lib/shared/report";

// one report with its messages
export const GET = api({}, async ({ me, sb, params }) => {
  const id = uuid(params.id, "Report");
  const { view } = await loadReport(sb, me, id);
  const messages = me.role === "client" ? [] : await rows<Record<string, unknown>>(
    sb.from(T.reportMessages).select("id,sender_id,sender_name,sender_role,message,item_type,kind,created_at").eq("report_id", id).order("created_at"), "the messages");
  return {
    report: view,
    messages: messages.map((m) => ({ id: m.id, senderId: m.sender_id, senderName: m.sender_name, senderRole: m.sender_role, message: m.message, item: m.item_type, kind: m.kind, at: m.created_at })),
    canFix: String(view.supervisorId) === me.id && view.status !== "approved",
    canDecide: me.role === "admin" && view.status !== "approved",
  };
});

// the supervisor fixes their own report (while it waits for review or was sent back); it goes back to review
export const PATCH = api({ roles: ["supervisor", "engineer"], shift: true, rate: { limit: 30, seconds: 600 } }, async ({ me, sb, params, body }) => {
  const id = uuid(params.id, "Report");
  const expected = stamp(body.expected);
  const { row } = await loadReport(sb, me, id);
  if (String(row.supervisor_id) !== me.id) fail(403, "ROLE", "Only the person who sent the report can fix it.");
  if (row.status === "approved") fail(409, "ALREADY_APPROVED", "This report is approved and locked. Ask the admin if something is wrong.");
  const parsed = parseBody(body.body);
  const fileIds = await checkFiles(sb, me, parsed);
  const { data, error } = await sb.from(T.reports)
    .update({ ...columnsFor(parsed, fileIds), status: "pending", resubmitted_at: row.status === "clarification" ? new Date().toISOString() : row.resubmitted_at ?? null })
    .eq("id", id).eq("supervisor_id", me.id).in("status", ["pending", "clarification"]).eq("updated_at", expected).select("*");
  if (error) throw error;
  if (!data?.length) fail(409, "CHANGED", "This report changed since you opened it (the admin may have looked at it). Nothing was saved. Reload to see it.");
  const names = await projectNames(sb, [String(row.project_id)]);
  return { report: normalizeReport(data![0] as Record<string, unknown>, names.get(String(row.project_id)) ?? null) };
});
