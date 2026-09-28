import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail, fromDb } from "@/lib/server/doctor";
import { maybe, rows } from "@/lib/server/truth";
import { uuid } from "@/lib/server/validate";

type Person = { id: string; full_name: string; role: string; avatar_file_id: string | null; avatar_url: string | null };

// my chats: the team chat (staff) and a direct chat with each admin (or, for the admin, with each person).
// The list never shows message text (it says how many are new); the chat shows it when opened.
export const GET = api({}, async ({ me, sb }) => {
  if (me.role !== "client") {
    const { error } = await sb.rpc("telgo_chat_team", { p_user: me.id });
    if (error) throw fromDb(error, "the team chat");
  }
  const [mine, people] = await Promise.all([
    rows<{ thread_id: string; last_read_at: string | null; joined_at: string }>(sb.from(T.chatMembers).select("thread_id,last_read_at,joined_at").eq("user_id", me.id).is("left_at", null), "your chats"),
    rows<Person>(
      me.role === "admin"
        ? sb.from(T.users).select("id,full_name,role,avatar_file_id,avatar_url").eq("access_status", "active").is("archived_at", null).eq("is_test", me.isTest).neq("id", me.id).order("full_name")
        : sb.from(T.users).select("id,full_name,role,avatar_file_id,avatar_url").eq("role", "admin").eq("access_status", "active").is("archived_at", null).eq("is_test", me.isTest).order("full_name"),
      "the people"),
  ]);
  const ids = mine.map((m) => m.thread_id);
  const threads = ids.length ? await rows<{ id: string; kind: string; title: string | null; direct_key: string | null; last_message_at: string | null }>(
    sb.from(T.chatThreads).select("id,kind,title,direct_key,last_message_at").in("id", ids).is("trashed_at", null).is("archived_at", null), "your chats") : [];
  const unread = new Map<string, number>();
  await Promise.all(mine.map(async (m) => {
    const { count } = await sb.from(T.chatMessages).select("id", { count: "exact", head: true }).eq("thread_id", m.thread_id).neq("sender_id", me.id)
      .is("removed_at", null).is("trashed_at", null).gt("created_at", m.last_read_at ?? m.joined_at);
    unread.set(m.thread_id, count ?? 0);
  }));
  const byOther = new Map<string, (typeof threads)[number]>();
  for (const t of threads) if (t.kind === "direct" && t.direct_key) {
    const other = t.direct_key.split(":").find((x) => x !== me.id);
    if (other) byOther.set(other, t);
  }
  const team = threads.find((t) => t.kind === "team");
  const list = [
    ...(team ? [{ threadId: team.id, kind: "team", title: "Team chat", withId: null as string | null, withRole: null as string | null, hasAvatar: false, lastAt: team.last_message_at, unread: unread.get(team.id) ?? 0 }] : []),
    ...people.map((p) => {
      const t = byOther.get(p.id);
      return { threadId: t?.id ?? null, kind: "direct", title: p.full_name, withId: p.id, withRole: p.role, hasAvatar: !!(p.avatar_file_id || p.avatar_url), lastAt: t?.last_message_at ?? null, unread: t ? unread.get(t.id) ?? 0 : 0 };
    }),
  ];
  list.sort((a, b) => (b.unread - a.unread) || (Date.parse(b.lastAt ?? "1970") - Date.parse(a.lastAt ?? "1970")) || (a.kind === "team" ? -1 : 0));
  return { chats: list };
});

// open (or start) the direct chat with one person: { with }
export const POST = api({}, async ({ me, sb, body }) => {
  const other = uuid(body.with, "Person");
  if (other === me.id) fail(400, "INVALID", "Choose someone else.");
  const p = await maybe<{ role: string; access_status: string; is_test: boolean }>(sb.from(T.users).select("role,access_status,is_test").eq("id", other).maybeSingle(), "the person");
  if (!p || p.is_test !== me.isTest || p.access_status !== "active") fail(404, "NOT_FOUND", "That person isn't in the app.");
  if (me.role !== "admin" && p!.role !== "admin") fail(403, "ROLE", "You can chat with the admin, and with everyone in the Team chat.");
  const { data, error } = await sb.rpc("telgo_chat_direct", { p_a: me.id, p_b: other });
  if (error) throw fromDb(error, "the chat");
  return { threadId: (data as { id: string }).id };
});
