import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail, fromDb } from "@/lib/server/doctor";
import { maybe, rows } from "@/lib/server/truth";
import { isoDate, str, oneOf } from "@/lib/server/validate";
import { checkFiles, columnsFor, LIST_COLS, listItem, parseBody, projectNames } from "@/lib/server/reports";
import { clientProjectIds } from "@/lib/server/projects";
import { addDays, istToday } from "@/lib/shared/format";
import { normalizeReport } from "@/lib/shared/report";

const CAP = 400;

// reports list: admin (any status), accounts (approved), client (approved, shared projects only)
export const GET = api({ roles: ["admin", "finance", "client"] }, async ({ me, sb, req }) => {
  const q = req.nextUrl.searchParams;
  const status = q.get("status") ?? (me.role === "admin" ? "pending" : "approved");
  if (me.role !== "admin" && status !== "approved") fail(403, "ROLE", "Your login can see approved reports only.");
  let query = sb.from(T.reports).select(LIST_COLS).eq("is_test", me.isTest).is("trashed_at", null)
    .order("report_date", { ascending: false }).order("created_at", { ascending: false }).limit(CAP);
  if (status !== "all") query = query.eq("status", oneOf(status, ["pending", "clarification", "approved"] as const, "Status"));
  if (q.get("from")) query = query.gte("report_date", isoDate(q.get("from"), "From"));
  if (q.get("to")) query = query.lte("report_date", isoDate(q.get("to"), "To"));
  if (q.get("person")) query = query.eq("supervisor_id", str(q.get("person"), { label: "Person", max: 40 }));
  if (q.get("archived") !== "1") query = query.is("archived_at", null);
  const project = q.get("project");
  if (me.role === "client") {
    const ids = await clientProjectIds(sb, me);
    if (!ids.length) return { reports: [] };
    query = query.in("project_id", project ? ids.filter((i) => i === project) : ids);
  } else if (project) query = query.eq("project_id", project);
  const list = await rows<Record<string, unknown>>(query, "the reports");
  const names = await projectNames(sb, list.map((r) => String(r.project_id)));
  const items = list.map((r) => listItem(r, names));
  if (me.role === "client") return { capped: list.length >= CAP, reports: items.map((r) => ({ ...r, summary: { ...r.summary, wages: 0, fuel: 0, travel: 0, room: 0, tool: 0, other: 0, expenses: 0 } })) };
  return { capped: list.length >= CAP, reports: items };
});

// send a daily report (site staff). The same reference sent twice saves once.
export const POST = api({ roles: ["supervisor", "engineer"], shift: true, rate: { limit: 30, seconds: 600 } }, async ({ me, sb, body }) => {
  const ref = str(body.ref, { label: "Reference", required: true, min: 8, max: 80 });
  const earlier = await maybe<Record<string, unknown>>(sb.from(T.reports).select("*").eq("client_ref", ref).maybeSingle(), "the report");
  if (earlier) {
    if (String(earlier.supervisor_id) !== me.id) fail(409, "DUPLICATE", "That reference belongs to another report.");
    const names = await projectNames(sb, [String(earlier.project_id)]);
    return { report: normalizeReport(earlier, names.get(String(earlier.project_id)) ?? null), repeat: true };
  }
  const projectId = str(body.projectId, { label: "Project", required: true, max: 80 });
  const p = await maybe<{ id: string; name: string; status: string }>(sb.from(T.projects).select("id,name,status").eq("id", projectId).eq("is_test", me.isTest).is("trashed_at", null).is("archived_at", null).maybeSingle(), "the project");
  if (!p) fail(400, "INVALID", "Project: choose one of the projects.");
  const day = isoDate(body.reportDate, "Date");
  const today = istToday();
  if (day > today) fail(400, "REPORT_DATE", "Date: a report can't be for a day that hasn't come yet.");
  if (day < addDays(today, -3)) fail(400, "REPORT_DATE", "Date: a report can be sent only for today or the 3 days before.");
  const parsed = parseBody(body.body);
  const fileIds = await checkFiles(sb, me, parsed);
  const { data, error } = await sb.from(T.reports).insert({
    ...columnsFor(parsed, fileIds),
    report_date: day,
    project_id: p!.id,
    supervisor_id: me.id,
    supervisor_name: me.fullName,
    status: "pending",
    client_ref: ref,
  }).select("*").single();
  if (error) {
    // two taps at the same moment: the second finds the first
    if (error.code === "23505") {
      const again = await maybe<Record<string, unknown>>(sb.from(T.reports).select("*").eq("client_ref", ref).maybeSingle(), "the report");
      if (again) return { report: normalizeReport(again, p!.name), repeat: true };
    }
    throw fromDb(error, "the report");
  }
  return { report: normalizeReport(data as Record<string, unknown>, p!.name), repeat: false };
});
