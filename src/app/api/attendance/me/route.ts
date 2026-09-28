import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { rows } from "@/lib/server/truth";
import { ATT_COLS } from "@/lib/server/attendance";
import { shiftsFromRows } from "@/lib/shared/attendance";
import { addDays, istToday } from "@/lib/shared/format";

// my shift now (if signed in) and my last 45 days
export const GET = api({ roles: ["supervisor", "engineer", "finance"] }, async ({ me, sb }) => {
  await sb.rpc("telgo_close_stale_shifts", { p_user: me.id });
  const from = addDays(istToday(), -45) + "T00:00:00+05:30";
  const list = await rows<Record<string, unknown>>(
    sb.from(T.attendance).select(ATT_COLS).eq("mobile_user_id", me.id).is("trashed_at", null).gte("check_in_at", from).order("check_in_at", { ascending: false }).limit(1500),
    "your attendance",
  );
  const shifts = shiftsFromRows(list);
  return { open: shifts.find((s) => s.state === "open" && !s.fromOldApp) ?? null, shifts };
});
