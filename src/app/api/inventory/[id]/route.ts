import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail, fromDb } from "@/lib/server/doctor";
import { maybe, rows } from "@/lib/server/truth";
import { oneOf, optNum, optStr, str, uuid } from "@/lib/server/validate";
import { projectNames } from "@/lib/server/reports";
import { CHANGE_COLS, changeView, itemView, loadItem } from "@/lib/server/inventory";
import { toLatLng } from "@/lib/shared/geo";

// one item with its whole history (every request and every decision)
export const GET = api({ roles: ["admin", "supervisor", "engineer", "finance"] }, async ({ me, sb, params }) => {
  const id = uuid(params.id, "Item");
  const r = await loadItem(sb, id, me.isTest);
  const [names, changes] = await Promise.all([
    projectNames(sb, [String(r.project_id)]),
    rows<Record<string, unknown>>(sb.from(T.invChanges).select(CHANGE_COLS).eq("item_id", id).is("trashed_at", null).order("requested_at", { ascending: false }), "the history"),
  ]);
  const history = changes.map(changeView);
  return {
    item: itemView(r, names.get(String(r.project_id)) ?? null, history.filter((c) => c.status === "pending").length),
    history,
    canRequest: me.role !== "finance" && r.status !== "closed" && !history.some((c) => c.status === "pending"),
  };
});

// ask for a change: { kind: moved|used|closed, quantityUsed?, newLocation?, lat?, lng?, note?, photoFileId?, ref }.
// Nothing changes on the item until the admin approves; the admins are told what, when and by whom.
export const POST = api({ roles: ["admin", "supervisor", "engineer"], shift: true, rate: { limit: 60, seconds: 600 } }, async ({ me, sb, params, body }) => {
  const id = uuid(params.id, "Item");
  await loadItem(sb, id, me.isTest);
  const ref = str(body.ref, { label: "Reference", required: true, min: 8, max: 80 });
  const earlier = await maybe<Record<string, unknown>>(sb.from(T.invChanges).select(CHANGE_COLS).eq("client_ref", ref).maybeSingle(), "the request");
  if (earlier) return { change: changeView(earlier), repeat: true };
  const kind = oneOf(body.kind, ["moved", "used", "closed"] as const, "What happened");
  const photo = body.photoFileId ? uuid(body.photoFileId, "Photo") : null;
  if (photo) {
    const f = await maybe<{ owner_id: string }>(sb.from(T.files).select("owner_id").eq("id", photo).maybeSingle(), "the photo");
    if (!f || f.owner_id !== me.id) fail(400, "INVALID", "Photo: add the photo again.");
  }
  const at = body.lat !== undefined && body.lat !== null ? toLatLng([body.lat, body.lng]) : null;
  const note = optStr(body.note, { label: "Note", max: 1000 });
  if (kind === "closed" && !note && !photo) fail(400, "INVALID", "Add a photo or a note saying how it was used up.");
  const { data, error } = await sb.from(T.invChanges).insert({
    item_id: id, kind,
    quantity_used: kind === "used" ? optNum(body.quantityUsed, { label: "How much was used", min: 0.01, max: 1e9 }) : null,
    new_location: kind === "moved" ? optStr(body.newLocation, { label: "Moved to", max: 200 }) : null,
    new_lat: kind === "moved" ? at?.[0] ?? null : null,
    new_lng: kind === "moved" ? at?.[1] ?? null : null,
    note, photo_file_id: photo, requested_by: me.id, requested_by_name: me.fullName, client_ref: ref,
  }).select(CHANGE_COLS).single();
  if (error) {
    if (error.code === "23505" && /one_pending/.test(error.message)) fail(409, "PENDING", "A change to this item is already waiting for the admin. Wait for that one first.");
    throw fromDb(error, "your request");
  }
  return { change: changeView(data as Record<string, unknown>) };
});
