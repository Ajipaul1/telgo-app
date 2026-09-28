import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { rows } from "@/lib/server/truth";
import { isoDate, oneOf } from "@/lib/server/validate";
import { projectNames } from "@/lib/server/reports";
import { normalizeReport, type ExpenseCategory } from "@/lib/shared/report";

const CAP = 1000;
const KINDS = ["wages", "fuel", "travel", "room", "tool", "other", "progress"] as const;

// every line of one kind from approved reports in a date range (admin, accounts):
// wages (crew and overtime per report), an expense kind (each bill), or site progress (the work done per report)
export const GET = api({ roles: ["admin", "finance"] }, async ({ me, sb, req }) => {
  const q = req.nextUrl.searchParams;
  const kind = oneOf(q.get("kind"), KINDS, "Kind");
  const from = isoDate(q.get("from"), "From");
  const to = isoDate(q.get("to"), "To");
  if (to < from) fail(400, "INVALID", "The end date is before the start date.");
  if (Date.parse(to) - Date.parse(from) > 370 * 86400e3) fail(400, "INVALID", "Choose at most one year at a time.");
  let query = sb.from(T.reports).select("*").eq("is_test", me.isTest).eq("status", "approved").is("trashed_at", null)
    .gte("report_date", from).lte("report_date", to).order("report_date", { ascending: false }).limit(CAP);
  if (q.get("project")) query = query.eq("project_id", q.get("project")!);
  const list = await rows<Record<string, unknown>>(query, "the approved reports");
  const names = await projectNames(sb, list.map((r) => String(r.project_id)));
  const reports = list.map((r) => normalizeReport(r, names.get(String(r.project_id)) ?? null));
  const head = (r: (typeof reports)[number]) => ({ reportId: r.id, day: r.reportDate, projectId: r.projectId, projectName: r.projectName, supervisorName: r.supervisorName });

  if (kind === "wages") {
    const items = reports.map((r) => ({
      ...head(r), workers: r.body.crew.workers, wageRate: r.body.crew.wageRate, note: r.body.crew.wagesNote,
      ot: r.body.crew.ot, total: r.summary.wages, fromOldApp: r.fromOldApp,
    })).filter((i) => i.total > 0 || i.workers > 0);
    return { kind, capped: list.length >= CAP, items, total: Math.round(items.reduce((a, i) => a + i.total, 0) * 100) / 100 };
  }
  if (kind === "progress") {
    const items = reports.map((r) => ({ ...head(r), summary: r.summary, work: r.body.work.map((w) => ({ key: w.key, value: w.value, note: w.note, photos: w.photos.length })) }))
      .filter((i) => i.summary.trenching || i.summary.hdd || i.summary.cableLaying || i.summary.cableMounting || i.summary.joints || i.summary.rmu || i.summary.terminations);
    const sum = (k: keyof (typeof items)[number]["summary"]) => Math.round(items.reduce((a, i) => a + Number(i.summary[k] || 0), 0) * 100) / 100;
    return { kind, capped: list.length >= CAP, items, total: { trenching: sum("trenching"), hdd: sum("hdd"), cableLaying: sum("cableLaying"), cableMounting: sum("cableMounting"), joints: sum("joints"), rmu: sum("rmu"), terminations: sum("terminations") } };
  }
  const cat = kind as ExpenseCategory;
  const items = reports.flatMap((r) => r.body.expenses.filter((e) => e.category === cat).map((e) => ({ ...head(r), id: `${r.id}:${e.id}`, amount: e.amount, name: e.name, note: e.note, bill: e.bill, fromOldApp: r.fromOldApp })));
  return { kind, capped: list.length >= CAP, items, total: Math.round(items.reduce((a, i) => a + i.amount, 0) * 100) / 100 };
});
