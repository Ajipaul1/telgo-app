import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { must, rows } from "@/lib/server/truth";
import { openPassword } from "@/lib/server/seal";

// every password at once, for "Show passwords" on Employees (admin, owner's decision). One line in the
// change log says the admin looked at them all.
export const GET = api({ roles: ["admin"], rate: { limit: 30, seconds: 600 } }, async ({ me, sb }) => {
  const list = await rows<{ id: string; password_view: string | null }>(
    sb.from(T.users).select("id,password_view").eq("is_test", me.isTest).is("trashed_at", null), "the passwords");
  await must(sb.from(T.audit).insert({ actor: me.id, table_name: "mobile_app_users", row_id: null, action: "view_passwords", changes: { people: list.length }, is_test: me.isTest }).select("id").single(), "the change log");
  return { passwords: list.map((p) => ({ id: p.id, password: openPassword(p.password_view) })) };
});
