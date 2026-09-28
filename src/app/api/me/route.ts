import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { must } from "@/lib/server/truth";
import { str, phone as phoneOf, oneOf, stamp } from "@/lib/server/validate";
import { fail } from "@/lib/server/doctor";
import { PERSON_COLS, personView, type PersonRow } from "@/lib/server/people";
import { VOICE_LANGS } from "@/lib/shared/voice";

// who is signed in, and what is waiting for them (the bell and the chat button)
export const GET = api({ allowMustChange: true }, async ({ me, sb }) => {
  const head = { count: "exact" as const, head: true };
  const live = (t: string) => sb.from(t).select("id", head).eq("is_test", me.isTest).is("trashed_at", null);
  const [p, notes, chats, review, fix, requests, approvals, myFix] = await Promise.all([
    must(sb.from(T.users).select(PERSON_COLS).eq("id", me.id).single(), "your profile"),
    sb.from(T.notifications).select("id", head).eq("recipient_user_id", me.id).eq("is_read", false).is("cleared_at", null),
    sb.rpc("telgo_chat_unread", { p_user: me.id }),
    me.role === "admin" ? live(T.reports).eq("status", "pending").is("archived_at", null) : Promise.resolve({ count: 0 }),
    me.role === "admin" ? live(T.reports).eq("status", "clarification").is("archived_at", null) : Promise.resolve({ count: 0 }),
    me.role === "admin" ? sb.from(T.users).select("id", head).eq("access_status", "pending").eq("is_test", me.isTest).is("archived_at", null) : Promise.resolve({ count: 0 }),
    me.role === "admin" ? sb.from(T.invChanges).select("id", head).eq("status", "pending").eq("is_test", me.isTest).is("trashed_at", null) : Promise.resolve({ count: 0 }),
    me.role === "supervisor" || me.role === "engineer" ? sb.from(T.reports).select("id", head).eq("supervisor_id", me.id).eq("status", "clarification").is("trashed_at", null) : Promise.resolve({ count: 0 }),
  ]);
  return {
    me: { ...personView(p as PersonRow), voiceLanguage: me.voiceLanguage, isTest: me.isTest },
    counts: {
      notifications: notes.count ?? 0,
      chats: typeof chats.data === "number" ? chats.data : 0,
      review: review.count ?? 0,
      fix: (me.role === "admin" ? fix.count : myFix.count) ?? 0,
      requests: requests.count ?? 0,
      approvals: approvals.count ?? 0,
    },
  };
});

// the person's own name, phone and voice language
export const PATCH = api({ allowMustChange: true }, async ({ me, sb, body }) => {
  const expected = stamp(body.expected);
  const patch: Record<string, unknown> = {};
  if (body.fullName !== undefined) patch.full_name = str(body.fullName, { label: "Name", required: true, min: 2, max: 80 });
  if (body.phone !== undefined) patch.phone = phoneOf(body.phone);
  if (body.voiceLanguage !== undefined) patch.voice_language = oneOf(body.voiceLanguage, VOICE_LANGS, "Voice language");
  if (!Object.keys(patch).length) fail(400, "INVALID", "Nothing to change.");
  const { data, error } = await sb.from(T.users).update(patch).eq("id", me.id).eq("updated_at", expected).select(PERSON_COLS);
  if (error) throw error;
  if (!data?.length) fail(409, "CHANGED", "Your profile was changed on another phone since you opened it. Nothing was saved. Reload to see it.");
  return { me: personView(data![0] as unknown as PersonRow) };
});
