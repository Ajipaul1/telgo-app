import "server-only";
import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { db, T } from "./core";
import { AppError } from "./doctor";
import { clientIp } from "./session";

export const PERSON_COLS =
  "id,full_name,email,phone,role,login_id,access_status,blocked_at,blocked_reason,last_login_at,created_at,updated_at,must_change_password,avatar_file_id,avatar_url,request_note,archived_at,is_test,voice_language";

export type PersonRow = {
  id: string; full_name: string | null; email: string | null; phone: string | null; role: string | null; login_id: string | null;
  access_status: string; blocked_at: string | null; blocked_reason: string | null; last_login_at: string | null; created_at: string | null;
  updated_at: string; must_change_password: boolean; avatar_file_id: string | null; avatar_url: string | null; request_note: string | null;
  archived_at: string | null; is_test: boolean; voice_language?: string | null;
};

// what a screen gets about a person (never a password, never the old in-row photo data)
export function personView(p: PersonRow) {
  return {
    id: p.id,
    fullName: p.full_name ?? "",
    email: p.email,
    phone: p.phone,
    role: p.role ?? "supervisor",
    loginId: p.login_id ?? "",
    status: p.archived_at ? "archived" : p.blocked_at || p.access_status === "blocked" ? "blocked" : p.access_status,
    blockedReason: p.blocked_reason,
    lastSignIn: p.last_login_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    mustChangePassword: p.must_change_password,
    hasAvatar: !!(p.avatar_file_id || p.avatar_url),
    requestNote: p.request_note,
    voiceLanguage: p.voice_language ?? "en-IN",
    isTest: !!p.is_test,
  };
}
export type PersonView = ReturnType<typeof personView>;

export const escLike = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);

export async function newLoginId() {
  for (let i = 0; i < 5; i++) {
    const id = "TLG-" + randomBytes(4).toString("hex").toUpperCase();
    const { data } = await db().from(T.users).select("id").ilike("login_id", id).limit(1);
    if (!data?.length) return id;
  }
  throw new AppError(500, "LOGIN_ID", "Couldn't make a new login ID. Try again.");
}

export async function recordAttempt(req: NextRequest, a: { identifier: string; userId?: string | null; ok: boolean; reason: string; isTest?: boolean }) {
  // the lock (5 wrong passwords) depends on this row: a sign-in whose attempt can't be recorded is refused
  const { error } = await db(a.userId).from(T.attempts).insert({
    identifier: a.identifier.slice(0, 200),
    user_id: a.userId ?? null,
    ok: a.ok,
    reason: a.reason,
    ip: clientIp(req),
    user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
    is_test: !!a.isTest,
  }).select("id");
  if (error) throw error;
}
