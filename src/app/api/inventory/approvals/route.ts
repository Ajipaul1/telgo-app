import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { rows } from "@/lib/server/truth";
import { projectNames } from "@/lib/server/reports";
import { CHANGE_COLS, ITEM_COLS, changeView, itemView } from "@/lib/server/inventory";

// inventory changes waiting for the admin, oldest first, each with its item
export const GET = api({ roles: ["admin"] }, async ({ me, sb }) => {
  const changes = await rows<Record<string, unknown>>(sb.from(T.invChanges).select(CHANGE_COLS).eq("status", "pending").eq("is_test", me.isTest).is("trashed_at", null).order("requested_at"), "the requests");
  const items = changes.length ? await rows<Record<string, unknown>>(sb.from(T.materials).select(ITEM_COLS).in("id", changes.map((c) => String(c.item_id))), "the items") : [];
  const names = await projectNames(sb, items.map((i) => String(i.project_id)));
  const byId = new Map(items.map((i) => [String(i.id), itemView(i, names.get(String(i.project_id)) ?? null, 1)]));
  return { requests: changes.map((c) => ({ ...changeView(c), item: byId.get(String(c.item_id)) ?? null })) };
});
