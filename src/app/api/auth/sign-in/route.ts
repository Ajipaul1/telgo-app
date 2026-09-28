import { NextResponse } from "next/server";
import { publicApi } from "@/lib/server/api";
import { db, T } from "@/lib/server/core";
import { AppError, fail } from "@/lib/server/doctor";
import { rows, must } from "@/lib/server/truth";
import { str } from "@/lib/server/validate";
import { checkPassword, hashPassword } from "@/lib/server/password";
import { openPassword, passwordCopy } from "@/lib/server/seal";
import { createSession, setSessionCookie } from "@/lib/server/session";
import { escLike, recordAttempt } from "@/lib/server/people";

const LOCK_AFTER = 5, LOCK_MIN = 15, NET_LIMIT = 30;
const WRONG = "Login ID or email, or password, is wrong.";

export const POST = publicApi({ rate: { limit: 40, seconds: 600 } }, async ({ req, body, ip }) => {
  const identifier = str(body.identifier, { label: "Login ID or email", required: true, max: 200 }).toLowerCase();
  const password = String(body.password ?? "");
  if (!password) fail(400, "INVALID", "Enter your password.");
  if (password.length > 200) fail(400, "INVALID", WRONG);
  const sb = db();

  // a network with many failures in the last hour is blocked for the hour
  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const netFails = await rows<{ id: number }>(sb.from(T.attempts).select("id").eq("ip", ip).eq("ok", false).gte("at", hourAgo).limit(NET_LIMIT), "sign-in history");
  if (netFails.length >= NET_LIMIT) {
    await recordAttempt(req, { identifier, ok: false, reason: "network_blocked" });
    fail(429, "NETWORK_BLOCKED", "Too many failed sign-ins from this network. Try again in an hour.");
  }

  // this login: 5 wrong passwords since its last good sign-in, within 15 minutes, lock it
  const lockFrom = new Date(Date.now() - LOCK_MIN * 60e3).toISOString();
  const recent = await rows<{ ok: boolean; at: string }>(
    sb.from(T.attempts).select("ok,at").ilike("identifier", escLike(identifier)).gte("at", lockFrom).order("at", { ascending: false }).limit(20),
    "sign-in history",
  );
  const sinceOk: { at: string }[] = [];
  for (const a of recent) { if (a.ok) break; sinceOk.push(a); }
  if (sinceOk.length >= LOCK_AFTER) {
    const unlockAt = Date.parse(sinceOk[LOCK_AFTER - 1].at) + LOCK_MIN * 60e3;
    const mins = Math.max(1, Math.ceil((unlockAt - Date.now()) / 60e3));
    await recordAttempt(req, { identifier, ok: false, reason: "locked" });
    fail(423, "LOCKED", `Too many wrong passwords. This login is locked for ${mins} more minute${mins === 1 ? "" : "s"}.`);
  }

  const col = identifier.includes("@") ? "email" : "login_id";
  const found = await rows<Record<string, unknown>>(
    sb.from(T.users).select("id,email,full_name,role,login_id,access_status,blocked_at,password_hash,password_view,must_change_password,archived_at,trashed_at,is_test")
      .ilike(col, escLike(identifier)).limit(2),
    "your login",
  );
  if (found.length > 1) {
    fail(409, "DUPLICATE_LOGIN", "Two logins share this email. Sign in with your login ID (TLG-…) instead, or ask the admin.");
  }
  const u = found[0];
  const triesLeft = LOCK_AFTER - sinceOk.length - 1;
  const wrong = async (reason: string, userId?: string, isTest?: boolean) => {
    await recordAttempt(req, { identifier, userId, ok: false, reason, isTest });
    throw new AppError(401, "WRONG", triesLeft > 0 ? `${WRONG} ${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left before this login is locked for ${LOCK_MIN} minutes.` : `${WRONG} This login is now locked for ${LOCK_MIN} minutes.`);
  };
  if (!u) return wrong("unknown");
  const check = await checkPassword(password, (u.password_hash as string) ?? null, (u.email as string) ?? null);
  if (!check.ok) return wrong(u.password_hash ? "wrong_password" : "no_password", String(u.id), !!u.is_test);

  const refuse = async (reason: string, message: string) => {
    await recordAttempt(req, { identifier, userId: String(u.id), ok: false, reason, isTest: !!u.is_test });
    throw new AppError(403, reason.toUpperCase(), message);
  };
  if (u.trashed_at) return refuse("gone", "This login no longer exists. Ask the Telgo office.");
  if (u.archived_at) return refuse("archived", "This login was switched off by the admin. Ask the Telgo office.");
  if (u.blocked_at || u.access_status === "blocked") return refuse("blocked", "This login is blocked. Ask the Telgo office.");
  if (u.access_status === "pending") return refuse("pending", "Your access request is still waiting for the admin's approval.");
  if (u.access_status !== "active") return refuse("inactive", "This login isn't active. Ask the Telgo office.");

  const userSb = db(String(u.id));
  const patch: Record<string, unknown> = { last_login_at: new Date().toISOString() };
  if (check.upgrade) patch.password_hash = await hashPassword(password);   // old-style hash upgraded now
  if (openPassword(u.password_view as string | null) !== password) Object.assign(patch, passwordCopy(password)); // the admin can see it (owner's decision)
  await must(userSb.from(T.users).update(patch).eq("id", u.id).select("id").single(), "your sign-in");
  await recordAttempt(req, { identifier, userId: String(u.id), ok: true, reason: check.upgrade ? "ok_upgraded" : "ok", isTest: !!u.is_test });

  const s = await createSession({ id: String(u.id), is_test: !!u.is_test }, req);
  const res = NextResponse.json({
    ok: true,
    serverTime: new Date().toISOString(),
    user: { id: u.id, fullName: u.full_name, role: u.role, loginId: u.login_id },
    mustChangePassword: !!u.must_change_password,
    resume: s.resume,
  }, { headers: { "Cache-Control": "no-store" } });
  setSessionCookie(res, s.token, s.expires, req);
  return res;
});
