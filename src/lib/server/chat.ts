import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { T } from "./core";
import { fail } from "./doctor";
import { maybe } from "./truth";
import type { Me } from "./session";

// may this person be in this chat? (members only; the admin may open any chat of their world)
export async function memberOf(sb: SupabaseClient, me: Me, threadId: string) {
  const t = await maybe<{ id: string; kind: string; title: string | null; direct_key: string | null; is_test: boolean; trashed_at: string | null; archived_at: string | null }>(
    sb.from(T.chatThreads).select("id,kind,title,direct_key,is_test,trashed_at,archived_at").eq("id", threadId).maybeSingle(), "the chat");
  if (!t || t.trashed_at || t.is_test !== me.isTest) fail(404, "NOT_FOUND", "That chat doesn't exist.");
  const m = await maybe<{ last_read_at: string | null; joined_at: string }>(
    sb.from(T.chatMembers).select("last_read_at,joined_at").eq("thread_id", threadId).eq("user_id", me.id).is("left_at", null).maybeSingle(), "the chat");
  if (!m) fail(403, "ROLE", "You aren't in this chat.");
  return { thread: t!, member: m! };
}

export const MSG_COLS = "id,thread_id,sender_id,kind,body,file_id,created_at,edited_at,removed_at";

export function messageView(m: Record<string, unknown>) {
  const removed = !!m.removed_at;
  return {
    id: String(m.id), senderId: String(m.sender_id), kind: String(m.kind), at: String(m.created_at),
    body: removed ? null : (m.body as string) ?? null, fileId: removed ? null : (m.file_id as string) ?? null,
    removed, edited: !!m.edited_at,
  };
}
