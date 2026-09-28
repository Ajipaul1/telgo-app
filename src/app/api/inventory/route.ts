import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail, fromDb } from "@/lib/server/doctor";
import { maybe, rows } from "@/lib/server/truth";
import { str, optStr, optNum, isoDate, uuid, oneOf } from "@/lib/server/validate";
import { escLike } from "@/lib/server/people";
import { projectNames } from "@/lib/server/reports";
import { ITEM_COLS, itemView, pendingCounts } from "@/lib/server/inventory";
import { addDays, istToday } from "@/lib/shared/format";
import { toLatLng } from "@/lib/shared/geo";

// inventory items (staff): ?project=&status=in_stock|closed|all&q=
export const GET = api({ roles: ["admin", "supervisor", "engineer", "finance"] }, async ({ me, sb, req }) => {
  const q = req.nextUrl.searchParams;
  const status = oneOf(q.get("status") ?? "in_stock", ["in_stock", "closed", "all"] as const, "Status");
  let query = sb.from(T.materials).select(ITEM_COLS).eq("is_test", me.isTest).is("trashed_at", null).is("archived_at", null)
    .order("unloaded_on", { ascending: false }).order("created_at", { ascending: false }).limit(500);
  if (status !== "all") query = query.eq("status", status);
  if (q.get("project")) query = query.eq("project_id", q.get("project")!);
  const search = str(q.get("q"), { label: "Search", max: 80 });
  if (search) query = query.or(["material", "description", "location", "created_by_name"].map((c) => `${c}.ilike.%${escLike(search).replace(/[,()]/g, " ")}%`).join(","));
  const list = await rows<Record<string, unknown>>(query, "the inventory");
  const [names, pend] = await Promise.all([projectNames(sb, list.map((r) => String(r.project_id))), pendingCounts(sb, list.map((r) => String(r.id)))]);
  return { items: list.map((r) => itemView(r, names.get(String(r.project_id)) ?? null, pend.get(String(r.id)) ?? 0)) };
});

// add an item at a site (site staff while signed in, and the admin); the admins are told by the database
export const POST = api({ roles: ["admin", "supervisor", "engineer"], shift: true, rate: { limit: 60, seconds: 600 } }, async ({ me, sb, body }) => {
  const ref = str(body.ref, { label: "Reference", required: true, min: 8, max: 80 });
  const earlier = await maybe<Record<string, unknown>>(sb.from(T.materials).select(ITEM_COLS).eq("client_ref", ref).maybeSingle(), "the item");
  if (earlier) {
    const n = await projectNames(sb, [String(earlier.project_id)]);
    return { item: itemView(earlier, n.get(String(earlier.project_id)) ?? null), repeat: true };
  }
  const projectId = str(body.projectId, { label: "Project", required: true, max: 80 });
  const p = await maybe<{ id: string; name: string }>(sb.from(T.projects).select("id,name").eq("id", projectId).eq("is_test", me.isTest).is("trashed_at", null).maybeSingle(), "the project");
  if (!p) fail(400, "INVALID", "Project: choose one of the projects.");
  const day = body.unloadedOn ? isoDate(body.unloadedOn, "Date") : istToday();
  if (day > istToday()) fail(400, "INVALID", "Date: it can't be in the future.");
  if (day < addDays(istToday(), -60)) fail(400, "INVALID", "Date: at most 60 days back.");
  const photo = body.photoFileId ? uuid(body.photoFileId, "Photo") : null;
  if (photo) {
    const f = await maybe<{ owner_id: string }>(sb.from(T.files).select("owner_id").eq("id", photo).maybeSingle(), "the photo");
    if (!f || f.owner_id !== me.id) fail(400, "INVALID", "Photo: add the photo again.");
  }
  const at = body.lat !== undefined && body.lat !== null ? toLatLng([body.lat, body.lng]) : null;
  const { data, error } = await sb.from(T.materials).insert({
    project_id: p!.id,
    unloaded_on: day,
    material: str(body.material, { label: "Item", required: true, max: 120 }),
    description: optStr(body.description, { label: "Description", max: 1000 }),
    quantity: optNum(body.quantity, { label: "Quantity", min: 0, max: 1e9 }),
    unit: optStr(body.unit, { label: "Unit", max: 20 }),
    location: str(body.location, { label: "Where it is kept", required: true, max: 200 }),
    location_lat: at?.[0] ?? null,
    location_lng: at?.[1] ?? null,
    note: optStr(body.note, { label: "Note", max: 1000 }),
    photo_file_id: photo,
    created_by: me.id,
    created_by_name: me.fullName,
    client_ref: ref,
  }).select(ITEM_COLS).single();
  if (error) throw fromDb(error, "the item");
  return { item: itemView(data as Record<string, unknown>, p!.name), repeat: false };
});
