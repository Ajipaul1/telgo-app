import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail, fromDb } from "@/lib/server/doctor";
import { maybe, rows } from "@/lib/server/truth";
import { oneOf, str, uuid } from "@/lib/server/validate";
import { memberOf, messageView, MSG_COLS } from "@/lib/server/chat";

// a chat's messages (the last 150, or those after ?after=) and its people, with when each last read it
export const GET = api({}, async ({ me, sb, params, req }) => {
  const id = uuid(params.id, "Chat");
  const { thread } = await memberOf(sb, me, id);
  const after = req.nextUrl.searchParams.get("after");
  let q = sb.from(T.chatMessages).select(MSG_COLS).eq("thread_id", id).is("trashed_at", null).order("created_at", { ascending: false }).limit(150);
  if (after && !Number.isNaN(Date.parse(after))) q = q.gt("created_at", after);
  const [msgs, members] = await Promise.all([
    rows<Record<string, unknown>>(q, "the messages"),
    rows<{ user_id: string; last_read_at: string | null }>(sb.from(T.chatMembers).select("user_id,last_read_at").eq("thread_id", id).is("left_at", null), "the chat's people"),
  ]);
  const people = members.length ? await rows<{ id: string; full_name: string; role: string; avatar_file_id: string | null; avatar_url: string | null }>(
    sb.from(T.users).select("id,full_name,role,avatar_file_id,avatar_url").in("id", members.map((m) => m.user_id)), "the chat's people") : [];
  const read = new Map(members.map((m) => [m.user_id, m.last_read_at]));
  return {
    thread: { id: thread.id, kind: thread.kind, title: thread.kind === "team" ? "Team chat" : people.find((p) => p.id !== me.id)?.full_name ?? "Chat" },
    people: people.map((p) => ({ id: p.id, fullName: p.full_name, role: p.role, hasAvatar: !!(p.avatar_file_id || p.avatar_url), lastReadAt: read.get(p.id) ?? null })),
    messages: msgs.reverse().map(messageView),
  };
});

// send: { kind: text|photo|voice|file, body?, fileId?, ref }; the same ref twice sends once
export const POST = api({ shift: true, rate: { limit: 120, seconds: 600 } }, async ({ me, sb, params, body }) => {
  const id = uuid(params.id, "Chat");
  await memberOf(sb, me, id);
  const kind = oneOf(body.kind ?? "text", ["text", "photo", "voice", "file"] as const, "Kind");
  const ref = str(body.ref, { label: "Reference", required: true, min: 8, max: 80 });
  const text = str(body.body, { label: "Message", max: 4000 });
  const fileId = body.fileId ? uuid(body.fileId, "File") : null;
  if (kind === "text" && !text) fail(400, "INVALID", "Write a message.");
  if (kind !== "text") {
    if (!fileId) fail(400, "INVALID", "Add the photo, voice note or file again.");
    const f = await maybe<{ owner_id: string; kind: string }>(sb.from(T.files).select("owner_id,kind").eq("id", fileId!).maybeSingle(), "the file");
    if (!f || f.owner_id !== me.id || !["chat", "voice"].includes(f.kind)) fail(400, "INVALID", "Add the photo, voice note or file again.");
  }
  const { data, error } = await sb.from(T.chatMessages).insert({ thread_id: id, sender_id: me.id, kind, body: text || null, file_id: fileId, client_ref: ref, is_test: me.isTest }).select(MSG_COLS).single();
  if (error) {
    if (error.code === "23505") {
      const again = await maybe<Record<string, unknown>>(sb.from(T.chatMessages).select(MSG_COLS).eq("client_ref", ref).maybeSingle(), "your message");
      if (again && String(again.sender_id) === me.id) return { message: messageView(again), repeat: true };
    }
    throw fromDb(error, "your message");
  }
  return { message: messageView(data as Record<string, unknown>) };
});
