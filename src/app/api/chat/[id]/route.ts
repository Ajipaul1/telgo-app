import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail, fromDb } from "@/lib/server/doctor";
import { maybe, rows } from "@/lib/server/truth";
import { oneOf, str, uuid } from "@/lib/server/validate";
import { memberOf, messageView, MSG_COLS } from "@/lib/server/chat";
import { chatTitle, isSticker } from "@/lib/shared/chat";

const PAGE = 60;

// a chat's messages (the newest 60, or 50 before ?before= for "Show earlier messages") and its people,
// with when each last read it. What this person cleared for themselves stays hidden for them.
export const GET = api({}, async ({ me, sb, params, req }) => {
  const id = uuid(params.id, "Chat");
  const { thread, member } = await memberOf(sb, me, id);
  const before = req.nextUrl.searchParams.get("before");
  const size = before ? 50 : PAGE;
  let q = sb.from(T.chatMessages).select(MSG_COLS).eq("thread_id", id).is("trashed_at", null).order("created_at", { ascending: false }).limit(size + 1);
  if (before && !Number.isNaN(Date.parse(before))) q = q.lt("created_at", before);
  if (member.cleared_at) q = q.gt("created_at", member.cleared_at);
  const [msgs, members] = await Promise.all([
    rows<Record<string, unknown>>(q, "the messages"),
    rows<{ user_id: string; last_read_at: string | null; added_by: string | null }>(sb.from(T.chatMembers).select("user_id,last_read_at,added_by").eq("thread_id", id).is("left_at", null), "the chat's people"),
  ]);
  const people = members.length ? await rows<{ id: string; full_name: string; role: string; avatar_file_id: string | null; avatar_url: string | null }>(
    sb.from(T.users).select("id,full_name,role,avatar_file_id,avatar_url").in("id", members.map((m) => m.user_id)), "the chat's people") : [];
  const read = new Map(members.map((m) => [m.user_id, m.last_read_at]));
  const other = thread.kind === "direct" ? people.find((p) => p.id !== me.id)?.full_name : null;
  return {
    thread: {
      id: thread.id, kind: thread.kind, title: chatTitle(thread.kind, thread.title, other), archived: !!thread.archived_at,
      clearedAt: thread.cleared_at, myClearedAt: member.cleared_at, canAdd: me.role === "admin" && thread.kind === "topic", canClearAll: me.role === "admin",
    },
    people: people.map((p) => ({ id: p.id, fullName: p.full_name, role: p.role, hasAvatar: !!(p.avatar_file_id || p.avatar_url), lastReadAt: read.get(p.id) ?? null })),
    messages: msgs.slice(0, size).reverse().map(messageView),
    more: msgs.length > size,
  };
});

// send: { kind: text|photo|voice|file|sticker, body?, fileId?, mentions?, ref }; the same ref twice sends once.
// A sticker's body is its name from the sticker list. @mentions count only for people in this chat.
export const POST = api({ shift: true, rate: { limit: 120, seconds: 600 } }, async ({ me, sb, params, body }) => {
  const id = uuid(params.id, "Chat");
  await memberOf(sb, me, id, { write: true });
  const kind = oneOf(body.kind ?? "text", ["text", "photo", "voice", "file", "sticker"] as const, "Kind");
  const ref = str(body.ref, { label: "Reference", required: true, min: 8, max: 80 });
  const text = str(body.body, { label: "Message", max: 4000 });
  const fileId = body.fileId && kind !== "text" && kind !== "sticker" ? uuid(body.fileId, "File") : null;
  if (kind === "text" && !text) fail(400, "INVALID", "Write a message.");
  if (kind === "sticker" && !isSticker(text)) fail(400, "INVALID", "That sticker isn't in the list.");
  if (kind !== "text" && kind !== "sticker") {
    if (!fileId) fail(400, "INVALID", "Add the photo, voice note or file again.");
    const f = await maybe<{ owner_id: string; kind: string }>(sb.from(T.files).select("owner_id,kind").eq("id", fileId!).maybeSingle(), "the file");
    if (!f || f.owner_id !== me.id || !["chat", "voice"].includes(f.kind)) fail(400, "INVALID", "Add the photo, voice note or file again.");
  }
  let mentions: string[] = [];
  if (Array.isArray(body.mentions) && body.mentions.length && kind !== "sticker") {
    const asked = [...new Set((body.mentions as unknown[]).slice(0, 30).map((x) => uuid(x, "Person")))].filter((x) => x !== me.id);
    if (asked.length) {
      const inChat = await rows<{ user_id: string }>(sb.from(T.chatMembers).select("user_id").eq("thread_id", id).is("left_at", null).in("user_id", asked), "the chat's people");
      mentions = inChat.map((m) => m.user_id);
    }
  }
  const { data, error } = await sb.from(T.chatMessages).insert({ thread_id: id, sender_id: me.id, kind, body: text || null, file_id: fileId, mentions, client_ref: ref, is_test: me.isTest }).select(MSG_COLS).single();
  if (error) {
    if (error.code === "23505") {
      const again = await maybe<Record<string, unknown>>(sb.from(T.chatMessages).select(MSG_COLS).eq("client_ref", ref).maybeSingle(), "your message");
      if (again && String(again.sender_id) === me.id) return { message: messageView(again), repeat: true };
    }
    throw fromDb(error, "your message");
  }
  return { message: messageView(data as Record<string, unknown>) };
});
