// Sessions (RULES.md section 7): a random ticket in an httpOnly cookie; the database keeps only its hash.
// Every request asks the database whether the ticket and its person are still good, so a blocked or
// archived login is out at its very next tap. Nothing about the login is kept in the phone's storage
// except the one-time "resume" ticket that restores a session an Android WebView lost.
import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { db, T } from "./core";
import { AppError } from "./doctor";
import { must, maybe } from "./truth";
import { sha256, token } from "./password";
import type { Role } from "@/lib/shared/roles";

export const SID = "telgo_sid";
const DAYS = 30;

export type Me = {
  sessionId: string;
  id: string;
  fullName: string;
  email: string | null;
  role: Role;
  loginId: string;
  mustChangePassword: boolean;
  hasAvatar: boolean;
  phone: string | null;
  voiceLanguage: string;
  isTest: boolean;
};

type SessionRow = {
  session_id: string | null; user_id: string | null; full_name: string | null; email: string | null; role: string | null;
  login_id: string | null; must_change_password: boolean | null; has_avatar: boolean | null; phone: string | null;
  voice_language: string | null; is_test: boolean | null; state: string;
};

// why a session ended, in words for the sign-in page
export const SIGNED_OUT_WHY: Record<string, string> = {
  none: "Sign in to continue.",
  signed_out: "You signed out. Sign in to continue.",
  expired: "Your sign-in expired. Sign in again.",
  blocked: "Your login was blocked by the admin. Ask the Telgo office.",
  archived: "Your login was switched off by the admin. Ask the Telgo office.",
  gone: "Your login no longer exists. Ask the Telgo office.",
  idle: "You were signed out after 12 hours without using the app.",
  everywhere: "You were signed out on all phones.",
  password: "Your password was changed. Sign in with the new one.",
  reset: "The admin reset your password. Sign in with the new one.",
};

export async function sessionFromToken(t: string | undefined | null): Promise<{ me: Me | null; state: string }> {
  if (!t || t.length < 20 || t.length > 100) return { me: null, state: "none" };
  const { data, error } = await db().rpc("telgo_session", { p_token_hash: sha256(t) });
  if (error) throw error;
  const r = (Array.isArray(data) ? data[0] : data) as SessionRow | undefined;
  if (!r || r.state !== "ok" || !r.user_id) return { me: null, state: r?.state ?? "none" };
  return {
    state: "ok",
    me: {
      sessionId: r.session_id!,
      id: r.user_id,
      fullName: r.full_name ?? "",
      email: r.email,
      role: (r.role ?? "supervisor") as Role,
      loginId: r.login_id ?? "",
      mustChangePassword: !!r.must_change_password,
      hasAvatar: !!r.has_avatar,
      phone: r.phone,
      voiceLanguage: r.voice_language ?? "en-IN",
      isTest: !!r.is_test,
    },
  };
}

export const readSession = (req: NextRequest) => sessionFromToken(req.cookies.get(SID)?.value);

export function clientIp(req: NextRequest) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function createSession(user: { id: string; is_test?: boolean | null }, req: NextRequest) {
  const t = token();
  const resume = token();
  const expires = new Date(Date.now() + DAYS * 86400e3);
  await must(
    db(user.id).from(T.sessions).insert({
      user_id: user.id,
      token_hash: sha256(t),
      resume_hash: sha256(resume),
      expires_at: expires.toISOString(),
      ip: clientIp(req),
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
      is_test: !!user.is_test,
    }).select("id").single(),
    "your sign-in",
  );
  return { token: t, resume, expires };
}

// An Android WebView sometimes drops its cookies; the app keeps a resume ticket (never the password)
// and trades it for a fresh session. The ticket changes every time it is used.
export async function resumeSession(resumeToken: string, req: NextRequest) {
  if (!resumeToken || resumeToken.length < 20 || resumeToken.length > 100) throw new AppError(401, "NO_SESSION", SIGNED_OUT_WHY.none);
  const s = await maybe<{ id: string; user_id: string; revoked_at: string | null; expires_at: string; is_test: boolean }>(
    db().from(T.sessions).select("id,user_id,revoked_at,expires_at,is_test").eq("resume_hash", sha256(resumeToken)).maybeSingle(),
    "your sign-in",
  );
  if (!s || s.revoked_at || Date.parse(s.expires_at) < Date.now()) throw new AppError(401, "NO_SESSION", SIGNED_OUT_WHY.expired);
  const t = token();
  const resume = token();
  await must(
    db(s.user_id).from(T.sessions).update({ token_hash: sha256(t), resume_hash: sha256(resume), last_seen_at: new Date().toISOString(), ip: clientIp(req) })
      .eq("id", s.id).is("revoked_at", null).select("id").single(),
    "your sign-in",
  );
  const check = await sessionFromToken(t);
  if (!check.me) throw new AppError(401, "NO_SESSION", SIGNED_OUT_WHY[check.state] ?? SIGNED_OUT_WHY.none);
  return { token: t, resume, expires: new Date(s.expires_at), me: check.me };
}

export function setSessionCookie(res: NextResponse, t: string, expires: Date, req: NextRequest) {
  res.cookies.set({
    name: SID,
    value: t,
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(req),
    path: "/",
    expires,
  });
}

export function clearSessionCookie(res: NextResponse, req: NextRequest) {
  res.cookies.set({ name: SID, value: "", httpOnly: true, sameSite: "lax", secure: isHttps(req), path: "/", maxAge: 0 });
  // the old app's cookie, if the phone still has it
  res.cookies.set({ name: "telgo_mobile_session", value: "", httpOnly: true, sameSite: "lax", secure: isHttps(req), path: "/", maxAge: 0 });
}

function isHttps(req: NextRequest) {
  return req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
}

export async function revokeSession(sessionId: string, actor: string, reason: string) {
  const { error } = await db(actor).from(T.sessions).update({ revoked_at: new Date().toISOString(), revoked_reason: reason }).eq("id", sessionId).is("revoked_at", null).select("id");
  if (error) throw error;
}

export async function revokeAllSessions(userId: string, actor: string, reason: string, exceptSessionId?: string) {
  // no phone keeps showing this person's notifications after they are signed out everywhere, reset or blocked
  if (["everywhere", "reset", "blocked", "archived"].includes(reason)) {
    const { error: pe } = await db(actor).from(T.pushSubs).update({ disabled_at: new Date().toISOString() }).eq("user_id", userId).is("disabled_at", null).select("id");
    if (pe) throw pe;
  }
  // confirmed: .select("id") is added below (unconfirmed-ok: checker sees a split statement)
  let q = db(actor).from(T.sessions).update({ revoked_at: new Date().toISOString(), revoked_reason: reason }).eq("user_id", userId).is("revoked_at", null);
  if (exceptSessionId) q = q.neq("id", exceptSessionId);
  const { error } = await q.select("id");
  if (error) throw error;
}
