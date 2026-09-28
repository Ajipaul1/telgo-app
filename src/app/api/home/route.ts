import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { rows, maybe } from "@/lib/server/truth";
import { ATT_COLS } from "@/lib/server/attendance";
import { LIST_COLS, listItem, projectNames } from "@/lib/server/reports";
import { clientProjectIds, listProjects } from "@/lib/server/projects";
import { shiftsFromRows } from "@/lib/shared/attendance";
import { addDays, istToday } from "@/lib/shared/format";

// the Home screen of each role, in one request
export const GET = api({}, async ({ me, sb }) => {
  const today = istToday();
  const yesterday = addDays(today, -1);
  const todayStart = today + "T00:00:00+05:30";
  if (me.role !== "client") await sb.rpc("telgo_close_stale_shifts", { p_user: me.role === "admin" ? null : me.id });

  if (me.role === "admin") {
    // who works where today, what time each signed in, and whose report for yesterday came in
    const [people, att, locs, reportsY, reportsToday, waiting, fix, requests] = await Promise.all([
      rows<{ id: string; full_name: string; role: string }>(sb.from(T.users).select("id,full_name,role").in("role", ["supervisor", "engineer", "finance"])
        .eq("access_status", "active").is("blocked_at", null).is("archived_at", null).eq("is_test", me.isTest).order("full_name"), "the team"),
      rows<Record<string, unknown>>(sb.from(T.attendance).select(ATT_COLS).gte("check_in_at", todayStart).eq("is_test", me.isTest).is("trashed_at", null).order("check_in_at"), "today's attendance"),
      rows<{ mobile_user_id: string; recorded_at: string; within_geofence: boolean; distance_from_site_m: number | null }>(
        sb.from(T.locations).select("mobile_user_id,recorded_at,within_geofence,distance_from_site_m").gte("recorded_at", todayStart).eq("is_test", me.isTest).order("recorded_at", { ascending: false }).limit(3000), "today's locations"),
      rows<Record<string, unknown>>(sb.from(T.reports).select(LIST_COLS).eq("report_date", yesterday).eq("is_test", me.isTest).is("trashed_at", null), "yesterday's reports"),
      rows<Record<string, unknown>>(sb.from(T.reports).select(LIST_COLS).eq("report_date", today).eq("is_test", me.isTest).is("trashed_at", null), "today's reports"),
      sb.from(T.reports).select("id", { count: "exact", head: true }).eq("status", "pending").eq("is_test", me.isTest).is("trashed_at", null).is("archived_at", null),
      sb.from(T.reports).select("id", { count: "exact", head: true }).eq("status", "clarification").eq("is_test", me.isTest).is("trashed_at", null).is("archived_at", null),
      sb.from(T.users).select("id", { count: "exact", head: true }).eq("access_status", "pending").eq("is_test", me.isTest).is("archived_at", null),
    ]);
    const shifts = shiftsFromRows(att);
    const lastSeen = new Map<string, (typeof locs)[number]>();
    for (const l of locs) if (!lastSeen.has(l.mobile_user_id)) lastSeen.set(l.mobile_user_id, l);
    const names = await projectNames(sb, [...reportsY, ...reportsToday].map((r) => String(r.project_id)));
    const field = people.filter((p) => p.role !== "finance");
    return {
      role: "admin",
      today,
      yesterday,
      people: people.map((p) => {
        const mine = shifts.filter((s) => s.userId === p.id);
        const first = mine[mine.length - 1] ?? null; // shifts are newest first
        const now = mine[0] ?? null;
        const seen = lastSeen.get(p.id);
        return {
          id: p.id, fullName: p.full_name, role: p.role,
          firstInAt: first?.inAt ?? null,
          now: now ? { state: now.state, projectName: now.projectName, inAt: now.inAt, outAt: now.outAt, within: now.inWithin, distanceM: now.inDistanceM } : null,
          lastSeenAt: seen?.recorded_at ?? null,
        };
      }),
      reportsYesterday: {
        sent: reportsY.map((r) => listItem(r, names)),
        missing: field.filter((p) => !reportsY.some((r) => String(r.supervisor_id) === p.id)).map((p) => ({ id: p.id, fullName: p.full_name })),
      },
      reportsToday: reportsToday.map((r) => listItem(r, names)),
      waiting: waiting.count ?? 0,
      askedToFix: fix.count ?? 0,
      accessRequests: requests.count ?? 0,
    };
  }

  if (me.role === "supervisor" || me.role === "engineer" || me.role === "finance") {
    const [att, mine] = await Promise.all([
      rows<Record<string, unknown>>(sb.from(T.attendance).select(ATT_COLS).eq("mobile_user_id", me.id).is("trashed_at", null).gte("check_in_at", addDays(today, -1) + "T00:00:00+05:30").order("check_in_at", { ascending: false }).limit(200), "your attendance"),
      me.role === "finance" ? Promise.resolve([]) : rows<Record<string, unknown>>(sb.from(T.reports).select(LIST_COLS).eq("supervisor_id", me.id).is("trashed_at", null).gte("report_date", addDays(today, -7)).order("report_date", { ascending: false }), "your reports"),
    ]);
    const shifts = shiftsFromRows(att);
    const names = await projectNames(sb, mine.map((r) => String(r.project_id)));
    const reports = mine.map((r) => listItem(r, names));
    const lastProject = await maybe<{ project_id: string }>(sb.from(T.attendance).select("project_id").eq("mobile_user_id", me.id).order("check_in_at", { ascending: false }).limit(1).maybeSingle(), "your last site");
    return {
      role: me.role,
      today,
      open: shifts.find((s) => s.state === "open" && !s.fromOldApp) ?? null,
      today_shifts: shifts.filter((s) => s.day === today),
      reports,
      reportToday: reports.find((r) => r.reportDate === today) ?? null,
      toFix: reports.filter((r) => r.status === "clarification"),
      lastProjectId: lastProject?.project_id ?? null,
    };
  }

  // client: the projects shared with them
  const ids = await clientProjectIds(sb, me);
  const projects = ids.length ? await listProjects(sb, me) : [];
  return { role: "client", today, projects };
});
