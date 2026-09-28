import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { rows } from "@/lib/server/truth";
import { list, oneOf, uuid } from "@/lib/server/validate";

// my notifications (made only by the database), newest first; cleared ones are gone from the list
export const GET = api({ allowMustChange: true }, async ({ me, sb }) => {
  const items = await rows<Record<string, unknown>>(
    sb.from(T.notifications).select("id,title,body,notification_type,link,is_read,created_at").eq("recipient_user_id", me.id).is("cleared_at", null)
      .order("created_at", { ascending: false }).limit(100),
    "your notifications",
  );
  return {
    notifications: items.map((n) => ({ id: n.id, title: n.title, body: n.body, topic: n.notification_type, link: n.link, read: n.is_read, at: n.created_at })),
    unread: items.filter((n) => !n.is_read).length,
  };
});

// { action: read|clear, ids?: [...] } — without ids: all of mine
export const POST = api({ allowMustChange: true }, async ({ me, sb, body }) => {
  const action = oneOf(body.action, ["read", "clear"] as const, "Action");
  const ids = body.ids === undefined ? null : list(body.ids, "Notifications", 200, (x) => uuid(x, "Notification"));
  if (ids && !ids.length) fail(400, "INVALID", "Nothing chosen.");
  const now = new Date().toISOString();
  // confirmed: the statement ends with .select("id") below (unconfirmed-ok: checker sees a split statement)
  let q = sb.from(T.notifications).update(action === "read" ? { is_read: true, read_at: now } : { cleared_at: now, is_read: true, read_at: now })
    .eq("recipient_user_id", me.id).is("cleared_at", null);
  if (ids) q = q.in("id", ids);
  const { data, error } = await q.select("id");
  if (error) throw error;
  return { changed: data?.length ?? 0 };
});
