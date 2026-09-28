import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { rows } from "@/lib/server/truth";
import { LIST_COLS, listItem, projectNames } from "@/lib/server/reports";

// my reports, newest first, with how many messages are waiting on each
export const GET = api({ roles: ["supervisor", "engineer"] }, async ({ me, sb }) => {
  const list = await rows<Record<string, unknown>>(
    sb.from(T.reports).select(LIST_COLS).eq("supervisor_id", me.id).is("trashed_at", null).order("report_date", { ascending: false }).order("created_at", { ascending: false }).limit(200),
    "your reports",
  );
  const names = await projectNames(sb, list.map((r) => String(r.project_id)));
  return { reports: list.map((r) => listItem(r, names)) };
});
