import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { T } from "./core";
import { fail } from "./doctor";
import { maybe, rows } from "./truth";

export const ITEM_COLS = "id,project_id,unloaded_on,material,description,quantity,quantity_left,unit,location,location_lat,location_lng,note,photo_file_id,status,closed_at,last_change_at,created_by,created_by_name,created_at,updated_at,archived_at,trashed_at,is_test";
export const CHANGE_COLS = "id,item_id,kind,quantity_used,new_location,new_lat,new_lng,note,photo_file_id,requested_by,requested_by_name,requested_at,status,decided_by_name,decided_at,decision_note";

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function itemView(r: Record<string, unknown>, projectName: string | null, pending: number = 0) {
  return {
    id: String(r.id), projectId: String(r.project_id), projectName, day: String(r.unloaded_on),
    material: String(r.material), description: (r.description as string) ?? null,
    quantity: num(r.quantity), quantityLeft: num(r.quantity_left), unit: (r.unit as string) ?? null,
    location: (r.location as string) ?? null, lat: num(r.location_lat), lng: num(r.location_lng), note: (r.note as string) ?? null,
    photoFileId: (r.photo_file_id as string) ?? null, status: String(r.status ?? "in_stock") as "in_stock" | "closed", closedAt: (r.closed_at as string) ?? null,
    lastChangeAt: (r.last_change_at as string) ?? null, addedBy: String(r.created_by_name ?? ""), addedById: String(r.created_by), addedAt: String(r.created_at),
    updatedAt: String(r.updated_at), pendingChanges: pending,
  };
}
export type ItemView = ReturnType<typeof itemView>;

export function changeView(c: Record<string, unknown>) {
  return {
    id: String(c.id), itemId: String(c.item_id), kind: String(c.kind) as "moved" | "used" | "closed",
    quantityUsed: num(c.quantity_used), newLocation: (c.new_location as string) ?? null, newLat: num(c.new_lat), newLng: num(c.new_lng),
    note: (c.note as string) ?? null, photoFileId: (c.photo_file_id as string) ?? null,
    requestedBy: String(c.requested_by_name ?? ""), requestedById: String(c.requested_by), requestedAt: String(c.requested_at),
    status: String(c.status) as "pending" | "approved" | "rejected", decidedBy: (c.decided_by_name as string) ?? null,
    decidedAt: (c.decided_at as string) ?? null, decisionNote: (c.decision_note as string) ?? null,
  };
}

export async function loadItem(sb: SupabaseClient, id: string, isTest: boolean) {
  const r = await maybe<Record<string, unknown>>(sb.from(T.materials).select(ITEM_COLS).eq("id", id).maybeSingle(), "the item");
  if (!r || r.is_test !== isTest || r.trashed_at) fail(404, "NOT_FOUND", "That item doesn't exist.");
  return r!;
}

export async function pendingCounts(sb: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const p = await rows<{ item_id: string }>(sb.from(T.invChanges).select("item_id").in("item_id", ids).eq("status", "pending"), "the requests");
  const m = new Map<string, number>();
  p.forEach((x) => m.set(x.item_id, (m.get(x.item_id) ?? 0) + 1));
  return m;
}
