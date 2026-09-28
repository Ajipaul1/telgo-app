import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { rows } from "@/lib/server/truth";
import { isoDate, uuid } from "@/lib/server/validate";
import { ATT_COLS } from "@/lib/server/attendance";
import { shiftsFromRows } from "@/lib/shared/attendance";
import { addDays, istToday } from "@/lib/shared/format";
import { fail } from "@/lib/server/doctor";

// attendance for a range of days (default: today), everyone or one person (admin)
export const GET = api({ roles: ["admin"] }, async ({ me, sb, req }) => {
  await sb.rpc("telgo_close_stale_shifts", { p_user: null });
  const q = req.nextUrl.searchParams;
  const from = q.get("from") ? isoDate(q.get("from"), "From") : istToday();
  const to = q.get("to") ? isoDate(q.get("to"), "To") : from;
  if (to < from) fail(400, "INVALID", "The end date is before the start date.");
  if (Date.parse(to) - Date.parse(from) > 62 * 86400e3) fail(400, "INVALID", "Choose at most two months at a time.");
  let query = sb.from(T.attendance).select(ATT_COLS).eq("is_test", me.isTest).is("trashed_at", null)
    .gte("check_in_at", from + "T00:00:00+05:30").lt("check_in_at", addDays(to, 1) + "T00:00:00+05:30")
    .order("check_in_at", { ascending: false }).limit(10000);
  const user = q.get("user");
  if (user) query = query.eq("mobile_user_id", uuid(user, "Person"));
  const [att, people] = await Promise.all([
    rows<Record<string, unknown>>(query, "attendance"),
    rows<{ id: string; full_name: string; role: string }>(sb.from(T.users).select("id,full_name,role").in("role", ["supervisor", "engineer", "finance"])
      .eq("access_status", "active").is("archived_at", null).eq("is_test", me.isTest).order("full_name"), "the team"),
  ]);
  return { from, to, shifts: shiftsFromRows(att), people: people.map((p) => ({ id: p.id, fullName: p.full_name, role: p.role })) };
});
