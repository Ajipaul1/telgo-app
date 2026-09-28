import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { maybe, must } from "@/lib/server/truth";
import { uuid } from "@/lib/server/validate";
import { openPassword } from "@/lib/server/seal";

// the admin sees one person's password (owner's decision). Every look is written in the change log.
// "not known": the login is from before passwords were kept this way; it shows after their next sign-in.
export const GET = api({ roles: ["admin"], rate: { limit: 120, seconds: 600 } }, async ({ me, sb, params }) => {
  const id = uuid(params.id, "Person");
  const p = await maybe<{ id: string; password_view: string | null; password_view_at: string | null; is_test: boolean }>(
    sb.from(T.users).select("id,password_view,password_view_at,is_test").eq("id", id).eq("is_test", me.isTest).is("trashed_at", null).maybeSingle(), "the person");
  if (!p) fail(404, "NOT_FOUND", "That person doesn't exist.");
  await must(sb.from(T.audit).insert({ actor: me.id, table_name: "mobile_app_users", row_id: id, action: "view_password", changes: {}, is_test: me.isTest }).select("id").single(), "the change log");
  const password = openPassword(p!.password_view);
  return { password, since: password ? p!.password_view_at : null };
});
