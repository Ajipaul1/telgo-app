import { api } from "@/lib/server/api";
import { fromDb } from "@/lib/server/doctor";
import { oneOf, optStr, uuid } from "@/lib/server/validate";
import { changeView } from "@/lib/server/inventory";

// the admin approves or refuses an inventory change; it is applied to the item in the same moment
export const POST = api({ roles: ["admin"], rate: { limit: 120, seconds: 600 } }, async ({ me, sb, params, body }) => {
  const id = uuid(params.id, "Request");
  const decision = oneOf(body.decision, ["approve", "reject"] as const, "Decision");
  const { data, error } = await sb.rpc("telgo_inventory_decide", { p_change: id, p_actor: me.id, p_decision: decision, p_note: optStr(body.note, { label: "Note", max: 500 }) });
  if (error) throw fromDb(error, "the decision");
  const r = data as { change: Record<string, unknown>; item: Record<string, unknown> };
  return { change: changeView(r.change), itemStatus: r.item.status, quantityLeft: r.item.quantity_left, location: r.item.location };
});
