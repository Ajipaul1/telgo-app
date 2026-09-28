import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { must, maybe, rows } from "@/lib/server/truth";
import { str, uuid } from "@/lib/server/validate";

// which client logins can see this project (admin)
export const GET = api({ roles: ["admin"] }, async ({ me, sb, params }) => {
  const id = str(params.id, { label: "Project", required: true, max: 80 });
  const [clients, access] = await Promise.all([
    rows<{ id: string; full_name: string; login_id: string }>(sb.from(T.users).select("id,full_name,login_id").eq("role", "client").eq("is_test", me.isTest).is("archived_at", null).order("full_name"), "client logins"),
    rows<{ user_id: string; granted_at: string; revoked_at: string | null }>(sb.from(T.projectAccess).select("user_id,granted_at,revoked_at").eq("project_id", id), "who can see it"),
  ]);
  const on = new Map(access.filter((a) => !a.revoked_at).map((a) => [a.user_id, a.granted_at]));
  return { clients: clients.map((c) => ({ id: c.id, fullName: c.full_name, loginId: c.login_id, sharedAt: on.get(c.id) ?? null })) };
});

// share or stop sharing: { userId, share: true|false }
export const POST = api({ roles: ["admin"] }, async ({ me, sb, params, body }) => {
  const id = str(params.id, { label: "Project", required: true, max: 80 });
  const userId = uuid(body.userId, "Client");
  const c = await maybe<{ role: string; is_test: boolean }>(sb.from(T.users).select("role,is_test").eq("id", userId).maybeSingle(), "the client");
  if (!c || c.role !== "client" || c.is_test !== me.isTest) fail(400, "INVALID", "That login isn't a client.");
  if (body.share === true) {
    const row = await must(sb.from(T.projectAccess).upsert({ user_id: userId, project_id: id, granted_by: me.id, granted_at: new Date().toISOString(), revoked_at: null, is_test: me.isTest }, { onConflict: "user_id,project_id" }).select("granted_at").single(), "sharing the project");
    return { sharedAt: row.granted_at };
  }
  await must(sb.from(T.projectAccess).update({ revoked_at: new Date().toISOString() }).eq("user_id", userId).eq("project_id", id).is("revoked_at", null).select("revoked_at"), "stopping the share");
  return { sharedAt: null };
});
