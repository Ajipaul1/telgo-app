import type { SupabaseClient } from "@supabase/supabase-js";
import { api } from "@/lib/server/api";
import { T } from "@/lib/server/core";
import { fail } from "@/lib/server/doctor";
import { maybe, rows } from "@/lib/server/truth";
import { email as emailOf, oneOf, phone as phoneOf, str, stamp, uuid } from "@/lib/server/validate";
import { escLike, personView, PERSON_COLS, type PersonRow } from "@/lib/server/people";
import { ROLES } from "@/lib/shared/roles";

async function person(sb: SupabaseClient, id: string, isTest: boolean) {
  const p = await maybe<PersonRow & { password_hash: string | null }>(sb.from(T.users).select(PERSON_COLS + ",password_hash").eq("id", id).eq("is_test", isTest).is("trashed_at", null).maybeSingle(), "the person");
  if (!p) fail(404, "NOT_FOUND", "That person doesn't exist.");
  return p!;
}

// one person: profile, phones signed in, last sign-in attempts, and their work so far (admin)
export const GET = api({ roles: ["admin"] }, async ({ me, sb, params }) => {
  const id = uuid(params.id, "Person");
  const p = await person(sb, id, me.isTest);
  const [sessions, attempts, reports] = await Promise.all([
    rows<Record<string, unknown>>(sb.from(T.sessions).select("id,created_at,last_seen_at,user_agent,ip").eq("user_id", id).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("last_seen_at", { ascending: false }), "their phones"),
    rows<Record<string, unknown>>(sb.from(T.attempts).select("at,ok,reason,ip").eq("user_id", id).order("at", { ascending: false }).limit(10), "their sign-ins"),
    sb.from(T.reports).select("id", { count: "exact", head: true }).eq("supervisor_id", id).is("trashed_at", null),
  ]);
  return {
    person: personView(p),
    passwordOldStyle: !!p.password_hash && !p.password_hash.startsWith("scrypt$"),
    hasPassword: !!p.password_hash,
    sessions: sessions.map((s) => ({ id: s.id, since: s.created_at, lastSeen: s.last_seen_at, device: s.user_agent, ip: s.ip })),
    attempts,
    reports: reports.count ?? 0,
  };
});

// change name, email, phone, work (admin); refused if someone changed the person since the screen loaded
export const PATCH = api({ roles: ["admin"] }, async ({ me, sb, params, body }) => {
  const id = uuid(params.id, "Person");
  const expected = stamp(body.expected);
  const p = await person(sb, id, me.isTest);
  const patch: Record<string, unknown> = {};
  if (body.fullName !== undefined) patch.full_name = str(body.fullName, { label: "Name", required: true, min: 2, max: 80 });
  if (body.phone !== undefined) patch.phone = phoneOf(body.phone);
  if (body.role !== undefined) {
    patch.role = oneOf(body.role, ROLES, "Work");
    if (id === me.id && patch.role !== "admin") fail(400, "SELF", "You can't take away your own admin rights.");
  }
  if (body.email !== undefined) {
    const e = emailOf(body.email);
    if (e !== (p.email ?? "").toLowerCase()) {
      const same = await rows(sb.from(T.users).select("id").ilike("email", escLike(e)).neq("id", id).limit(1), "the team");
      if (same.length) fail(409, "DUPLICATE", "Someone else already has a login with this email.");
      if (p.password_hash && !p.password_hash.startsWith("scrypt$")) {
        fail(409, "OLD_PASSWORD", "This person's password is still stored the old way, which depends on their email. Reset their password first, then change the email.");
      }
      patch.email = e;
    }
  }
  if (!Object.keys(patch).length) fail(400, "INVALID", "Nothing to change.");
  const { data, error } = await sb.from(T.users).update(patch).eq("id", id).eq("updated_at", expected).select(PERSON_COLS);
  if (error) throw error;
  if (!data?.length) fail(409, "CHANGED", "Someone changed this person since you opened it. Nothing was saved. Reload to see their change.");
  return { person: personView(data![0] as unknown as PersonRow) };
});
