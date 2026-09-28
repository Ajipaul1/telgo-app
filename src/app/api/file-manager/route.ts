import { after } from "next/server";
import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail, fromDb } from "@/lib/server/doctor";
import { rows } from "@/lib/server/truth";
import { oneOf, str } from "@/lib/server/validate";
import { escLike } from "@/lib/server/people";
import { purgeTrash } from "@/lib/server/purge";

const KINDS = ["reports", "attendance", "inventory", "changes", "projects", "files", "chats", "people"] as const;
type Kind = (typeof KINDS)[number];
const TABLE: Record<Kind, string> = { reports: T.reports, attendance: T.attendance, inventory: T.materials, changes: T.invChanges, projects: T.projects, files: T.files, chats: T.chatThreads, people: T.users };
const COLS: Record<Kind, string> = {
  reports: "id,report_date,project_id,supervisor_name,status,created_at,archived_at,trashed_at",
  attendance: "id,user_name,project_name,check_in_at,check_out_at,status,archived_at,trashed_at",
  inventory: "id,material,quantity,quantity_left,unit,project_id,unloaded_on,location,status,created_by_name,created_at,archived_at,trashed_at",
  changes: "id,item_id,kind,quantity_used,new_location,note,requested_by_name,requested_at,status,decided_by_name,archived_at,trashed_at",
  projects: "id,name,code,client_name,status,created_at,archived_at,trashed_at",
  files: "id,kind,mime,bytes,original_name,owner_id,created_at,archived_at,trashed_at",
  chats: "id,kind,title,direct_key,last_message_at,created_at,archived_at,trashed_at",
  people: "id,full_name,role,login_id,access_status,created_at,archived_at,trashed_at",
};
const SEARCH: Record<Kind, string[]> = {
  reports: ["supervisor_name", "project_id"], attendance: ["user_name", "project_name"], inventory: ["material", "created_by_name", "location", "description"], changes: ["requested_by_name", "new_location", "note"],
  projects: ["name", "code", "client_name"], files: ["original_name", "kind"], chats: ["title"], people: ["full_name", "login_id", "email"],
};

// one section of the File manager (admin): ?kind=&tab=active|archived|trash&q=
export const GET = api({ roles: ["admin"] }, async ({ me, sb, req }) => {
  const q = req.nextUrl.searchParams;
  const kind = oneOf(q.get("kind") ?? "reports", KINDS, "Section");
  const tab = oneOf(q.get("tab") ?? "active", ["active", "archived", "trash"] as const, "Tab");
  const search = str(q.get("q"), { label: "Search", max: 80 });
  let query = sb.from(TABLE[kind]).select(COLS[kind]).eq("is_test", me.isTest).limit(300);
  if (tab === "trash") query = query.not("trashed_at", "is", null).order("trashed_at", { ascending: false });
  else {
    query = query.is("trashed_at", null);
    query = tab === "archived" ? query.not("archived_at", "is", null).order("archived_at", { ascending: false }) : query.is("archived_at", null).order(kind === "changes" ? "requested_at" : "created_at", { ascending: false });
  }
  if (search) query = query.or(SEARCH[kind].map((c) => `${c}.ilike.%${escLike(search).replace(/[,()]/g, " ")}%`).join(","));
  const list = await rows<Record<string, unknown>>(query, "the File manager");
  // reports: the project's name; chats: who is in each direct chat
  const pnames = kind === "reports" || kind === "inventory" ? new Map((await rows<{ id: string; name: string }>(sb.from(T.projects).select("id,name").in("id", [...new Set(list.map((r) => String(r.project_id)))]), "project names")).map((p) => [p.id, p.name])) : new Map<string, string>();
  let names = new Map<string, string>();
  if (kind === "chats" || kind === "files") {
    const ids = new Set<string>();
    list.forEach((r) => { String(r.direct_key ?? "").split(":").forEach((x) => x.length === 36 && ids.add(x)); if (r.owner_id) ids.add(String(r.owner_id)); });
    if (ids.size) names = new Map((await rows<{ id: string; full_name: string }>(sb.from(T.users).select("id,full_name").in("id", [...ids]), "names")).map((p) => [p.id, p.full_name]));
  }
  // the clean-up runs after the reply (removes what has been 90 days in the Trash)
  after(async () => { await purgeTrash().catch(() => {}); });
  return {
    kind, tab,
    items: list.map((r) => ({
      id: String(r.id),
      row: kind === "chats" ? { ...r, title: r.kind === "team" ? "Team chat" : r.kind === "topic" ? `Group: ${String(r.title ?? "")}` : String(r.direct_key ?? "").split(":").map((x) => names.get(x) ?? "?").join(" and ") } :
        kind === "files" ? { ...r, owner: names.get(String(r.owner_id)) ?? "" } :
        kind === "reports" || kind === "inventory" ? { ...r, project_name: pnames.get(String(r.project_id)) ?? null } : r,
      archivedAt: (r.archived_at as string) ?? null,
      trashedAt: (r.trashed_at as string) ?? null,
      goneOn: r.trashed_at ? new Date(Date.parse(String(r.trashed_at)) + 90 * 86400e3).toISOString() : null,
    })),
  };
});

// move one record: { kind, id, action: archive|unarchive|trash|restore }
export const POST = api({ roles: ["admin"], rate: { limit: 200, seconds: 600 } }, async ({ me, sb, body }) => {
  const kind = oneOf(body.kind, KINDS, "Section");
  const id = str(body.id, { label: "Record", required: true, max: 80 });
  const action = oneOf(body.action, ["archive", "unarchive", "trash", "restore"] as const, "Action");
  const { data, error } = await sb.rpc("telgo_fm_move", { p_kind: kind, p_id: id, p_action: action, p_actor: me.id });
  if (error) throw fromDb(error, "the move");
  if (!data) fail(409, "NO_CHANGE", "Nothing changed.");
  const r = data as Record<string, unknown>;
  return { id, archivedAt: r.archived_at ?? null, trashedAt: r.trashed_at ?? null };
});
