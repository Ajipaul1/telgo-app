import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { must, rows } from "@/lib/server/truth";
import { str, uuid } from "@/lib/server/validate";
import { loadReport } from "@/lib/server/reports";

// the messages on a report (refreshed while the report is open)
export const GET = api({ roles: ["admin", "supervisor", "engineer", "finance"] }, async ({ me, sb, params }) => {
  const id = uuid(params.id, "Report");
  await loadReport(sb, me, id);
  const list = await rows<Record<string, unknown>>(sb.from(T.reportMessages).select("id,sender_id,sender_name,sender_role,message,item_type,kind,created_at").eq("report_id", id).order("created_at"), "the messages");
  return { messages: list.map((m) => ({ id: m.id, senderId: m.sender_id, senderName: m.sender_name, senderRole: m.sender_role, message: m.message, item: m.item_type, kind: m.kind, at: m.created_at })) };
});

// a message about a report, between its supervisor and the admin (the database tells the other side)
export const POST = api({ roles: ["admin", "supervisor", "engineer"], shift: true, rate: { limit: 60, seconds: 600 } }, async ({ me, sb, params, body }) => {
  const id = uuid(params.id, "Report");
  const { row } = await loadReport(sb, me, id);
  if (me.role !== "admin" && String(row.supervisor_id) !== me.id) fail(403, "ROLE", "Only the report's supervisor and the admin can write here.");
  const message = str(body.message, { label: "Message", required: true, max: 2000 });
  const m = await must(sb.from(T.reportMessages).insert({
    report_id: id, sender_id: me.id, sender_name: me.fullName, sender_role: me.role, message, item_type: str(body.item, { label: "About", max: 40 }) || null, kind: "message", is_test: me.isTest,
  }).select("id,sender_id,sender_name,sender_role,message,item_type,kind,created_at").single(), "your message");
  return { message: { id: m.id, senderId: m.sender_id, senderName: m.sender_name, senderRole: m.sender_role, message: m.message, item: m.item_type, kind: m.kind, at: m.created_at } };
});
