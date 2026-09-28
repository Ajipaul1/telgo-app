import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail, fromDb } from "@/lib/server/doctor";
import { maybe, rows } from "@/lib/server/truth";
import { str, uuid } from "@/lib/server/validate";

type Person = { id: string; full_name: string; role: string; avatar_file_id: string | null; avatar_url: string | null };
type Mine = { thread_id: string; last_read_at: string | null; joined_at: string; cleared_at: string | null };

// my chats: the Team chat (always first), my group chats, and a direct chat with each admin (or, for
// the admin, with each person). The list never shows message text (it says how many are new, and
// whether I was @mentioned); the chat shows it when opened.
export const GET = api({}, async ({ me, sb }) => {
  if (me.role !== "client") {
    const { error } = await sb.rpc("telgo_chat_team", { p_user: me.id });
    if (error) throw fromDb(error, "the team chat");
  }
  const [mine, people] = await Promise.all([
    rows<Mine>(sb.from(T.chatMembers).select("thread_id,last_read_at,joined_at,cleared_at").eq("user_id", me.id).is("left_at", null), "your chats"),
    rows<Person>(
      me.role === "admin"
        ? sb.from(T.users).select("id,full_name,role,avatar_file_id,avatar_url").eq("access_status", "active").is("archived_at", null).eq("is_test", me.isTest).neq("id", me.id).order("full_name")
        : sb.from(T.users).select("id,full_name,role,avatar_file_id,avatar_url").eq("role", "admin").eq("access_status", "active").is("archived_at", null).eq("is_test", me.isTest).order("full_name"),
      "the people"),
  ]);
  const ids = mine.map((m) => m.thread_id);
  const threads = ids.length ? await rows<{ id: string; kind: string; title: string | null; direct_key: string | null; last_message_at: string | null }>(
    sb.from(T.chatThreads).select("id,kind,title,direct_key,last_message_at").in("id", ids).is("trashed_at", null).is("archived_at", null), "your chats") : [];
  const live = new Set(threads.map((t) => t.id));
  const unread = new Map<string, { n: number; mentioned: boolean }>();
  const sizes = new Map<string, number>();
  await Promise.all(mine.filter((m) => live.has(m.thread_id)).map(async (m) => {
    const from = [m.last_read_at ?? m.joined_at, m.cleared_at].filter(Boolean).sort().pop()!;
    const base = () => sb.from(T.chatMessages).select("id", { count: "exact", head: true }).eq("thread_id", m.thread_id).neq("sender_id", me.id)
      .is("removed_at", null).is("trashed_at", null).gt("created_at", from);
    const [all, named] = await Promise.all([base(), base().contains("mentions", [me.id])]);
    if (all.error) throw fromDb(all.error, "your chats");
    unread.set(m.thread_id, { n: all.count ?? 0, mentioned: (named.count ?? 0) > 0 });
  }));
  const groups = threads.filter((t) => t.kind === "topic");
  if (groups.length) {
    const mem = await rows<{ thread_id: string }>(sb.from(T.chatMembers).select("thread_id").in("thread_id", groups.map((g) => g.id)).is("left_at", null), "the chats' people");
    for (const x of mem) sizes.set(x.thread_id, (sizes.get(x.thread_id) ?? 0) + 1);
  }
  const byOther = new Map<string, (typeof threads)[number]>();
  for (const t of threads) if (t.kind === "direct" && t.direct_key) {
    const other = t.direct_key.split(":").find((x) => x !== me.id);
    if (other) byOther.set(other, t);
  }
  const row = (t: (typeof threads)[number] | undefined) => ({ lastAt: t?.last_message_at ?? null, unread: t ? unread.get(t.id)?.n ?? 0 : 0, mentioned: t ? !!unread.get(t.id)?.mentioned : false });
  const team = threads.find((t) => t.kind === "team");
  const rest = [
    ...groups.map((g) => ({ threadId: g.id, kind: "topic", title: g.title ?? "Group chat", withId: null as string | null, withRole: null as string | null, hasAvatar: false, people: sizes.get(g.id) ?? 0, ...row(g) })),
    ...people.map((p) => {
      const t = byOther.get(p.id);
      return { threadId: t?.id ?? null, kind: "direct", title: p.full_name, withId: p.id, withRole: p.role, hasAvatar: !!(p.avatar_file_id || p.avatar_url), people: 2, ...row(t) };
    }),
  ];
  rest.sort((a, b) => (b.unread - a.unread) || (Date.parse(b.lastAt ?? "1970") - Date.parse(a.lastAt ?? "1970")) || a.title.localeCompare(b.title));
  // the Team chat is pinned on top (owner's rule), whatever else is new
  const list = [...(team ? [{ threadId: team.id, kind: "team", title: "Team chat", withId: null, withRole: null, hasAvatar: false, people: 0, ...row(team) }] : []), ...rest];
  return { chats: list, canMakeGroups: me.role !== "client" };
});

// { with }: open (or start) the direct chat with one person.
// { title, members }: make a group chat (the + button). The admin picks the people; anyone else's
// group is with the admin. Every admin is in every group. The people added are told.
export const POST = api({ rate: { limit: 30, seconds: 600 } }, async ({ me, sb, body }) => {
  if (body.title !== undefined) {
    const title = str(body.title, { label: "Chat name", required: true, max: 80 });
    const members = Array.isArray(body.members) ? (body.members as unknown[]).slice(0, 100).map((x) => uuid(x, "Person")) : [];
    const { data, error } = await sb.rpc("telgo_chat_topic", { p_user: me.id, p_title: title, p_members: members });
    if (error) throw fromDb(error, "the new chat");
    return { threadId: (data as { id: string }).id };
  }
  const other = uuid(body.with, "Person");
  if (other === me.id) fail(400, "INVALID", "Choose someone else.");
  const p = await maybe<{ role: string; access_status: string; is_test: boolean }>(sb.from(T.users).select("role,access_status,is_test").eq("id", other).maybeSingle(), "the person");
  if (!p || p.is_test !== me.isTest || p.access_status !== "active") fail(404, "NOT_FOUND", "That person isn't in the app.");
  if (me.role !== "admin" && p!.role !== "admin") fail(403, "ROLE", "You can chat with the admin, in the Team chat and in group chats.");
  const { data, error } = await sb.rpc("telgo_chat_direct", { p_a: me.id, p_b: other });
  if (error) throw fromDb(error, "the chat");
  return { threadId: (data as { id: string }).id };
});
