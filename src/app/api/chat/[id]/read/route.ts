import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { must } from "@/lib/server/truth";
import { uuid } from "@/lib/server/validate";
import { memberOf } from "@/lib/server/chat";

// I have read this chat up to now (the others see "Seen"); its notification card is marked read too
export const POST = api({}, async ({ me, sb, params }) => {
  const id = uuid(params.id, "Chat");
  await memberOf(sb, me, id);
  const now = new Date().toISOString();
  const row = await must(sb.from(T.chatMembers).update({ last_read_at: now }).eq("thread_id", id).eq("user_id", me.id).select("last_read_at").single(), "reading the chat");
  // unconfirmed-ok: the chat's read time is confirmed above; the bell card is only a convenience
  await sb.from(T.notifications).update({ is_read: true, read_at: now }).eq("recipient_user_id", me.id).eq("entity_type", "chat").eq("entity_id", id).eq("is_read", false);
  return { readAt: row.last_read_at };
});
