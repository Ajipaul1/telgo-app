// The gate every API route goes through (RULES.md section 7). Deny by default:
// 1. a change must come from this app's own page (Origin check, stops cross-site forms);
// 2. the session ticket is checked with the database, and so is the person (blocked = out now);
// 3. the role must be allowed; a temporary password must be changed before anything else;
// 4. changes are rate-limited per person, public forms per network;
// 5. anything that goes wrong is answered by the Error Doctor, never with raw internals.
import "server-only";
import { after, NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { db, T } from "./core";
import { AppError, toReply } from "./doctor";
import { clearSessionCookie, clientIp, readSession, SIGNED_OUT_WHY, type Me } from "./session";
import { signsIn, type Role } from "@/lib/shared/roles";

export type Ctx = {
  req: NextRequest;
  me: Me;
  sb: SupabaseClient;             // the database, acting as this person (for the change log)
  params: Record<string, string>;
  body: Record<string, unknown>;
  ip: string;
};
export type PublicCtx = Omit<Ctx, "me"> & { me: Me | null };

type Opts = {
  roles?: Role[];                 // omitted = any signed-in person
  allowMustChange?: boolean;      // routes a person with a temporary password may still use
  rate?: { limit: number; seconds: number }; // extra limit for this route (per person, or per network if public)
  shift?: boolean;                // employees (site staff, accounts) must be signed in at work for this (owner's rule)
};

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function checkOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin) {
    let o: URL;
    try { o = new URL(origin); } catch { throw new AppError(403, "ORIGIN", "This change didn't come from the Telgo app, so it was refused."); }
    if (o.host !== host) throw new AppError(403, "ORIGIN", "This change didn't come from the Telgo app, so it was refused.");
    return;
  }
  // no Origin header: only a same-site fetch is accepted
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") throw new AppError(403, "ORIGIN", "This change didn't come from the Telgo app, so it was refused.");
}

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return {};
  const text = await req.text();
  if (text.length > 1_000_000) throw new AppError(413, "TOO_BIG", "That is too much to send at once. Send photos one by one.");
  if (!text) return {};
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    throw new AppError(400, "BAD_JSON", "The app sent something the server could not read. Reload the app and try again.");
  }
}

async function rateOk(key: string, limit: number, seconds: number) {
  const { data, error } = await db().rpc("telgo_rate_ok", { p_key: key, p_limit: limit, p_window_seconds: seconds });
  if (error) throw error;
  return data === true;
}

// signed in at work now: an open shift from the last 12 hours
async function onShift(userId: string) {
  const since = new Date(Date.now() - 12 * 3600e3).toISOString();
  const { data, error } = await db().from(T.attendance).select("id").eq("mobile_user_id", userId).eq("status", "signed_in").is("check_out_at", null).gt("check_in_at", since).limit(1);
  if (error) throw error;
  return !!data?.length;
}

async function pushLater() {
  const { sendPendingPush } = await import("./push");
  await sendPendingPush().catch(() => {});
}

type Handler<C> = (ctx: C) => Promise<object | Response>;
type RouteCtx = { params: Promise<Record<string, string>> };

function wrap<C>(opts: Opts & { public?: boolean }, handler: Handler<C>) {
  return async (req: NextRequest, context: RouteCtx) => {
    const route = `${req.method} ${req.nextUrl.pathname}`;
    let me: Me | null = null;
    try {
      const params = (await context?.params) ?? {};
      const write = req.method !== "GET" && req.method !== "HEAD";
      if (write) checkOrigin(req);
      const ip = clientIp(req);
      const s = await readSession(req);
      me = s.me;
      if (!opts.public) {
        if (!me) {
          const res = NextResponse.json(
            { ok: false, error: { code: "SIGNED_OUT", reason: s.state, message: SIGNED_OUT_WHY[s.state] ?? SIGNED_OUT_WHY.none } },
            { status: 401, headers: NO_STORE },
          );
          if (req.cookies.get("telgo_sid")) clearSessionCookie(res, req);
          return res;
        }
        if (me.mustChangePassword && !opts.allowMustChange) {
          throw new AppError(403, "CHANGE_PASSWORD", "Change your temporary password first (You → Profile).");
        }
        if (opts.roles && !opts.roles.includes(me.role)) {
          throw new AppError(403, "ROLE", "Your login can't open this.");
        }
        if (opts.shift && signsIn(me.role) && !(await onShift(me.id))) {
          throw new AppError(403, "NEED_SHIFT", "Sign in at your site first (Attendance → Sign in). The app works while you are signed in.");
        }
        if (write && !(await rateOk(`w:${me.id}`, 240, 600))) {
          throw new AppError(429, "RATE", "Too many changes in a short time. Wait a few minutes and try again.");
        }
      }
      if (opts.rate) {
        const who = opts.public || !me ? `ip:${ip}` : `u:${me.id}`;
        if (!(await rateOk(`r:${req.nextUrl.pathname}:${who}`, opts.rate.limit, opts.rate.seconds))) {
          throw new AppError(429, "RATE", "Too many tries in a short time. Wait a while and try again.");
        }
      }
      const body = write ? await readBody(req) : {};
      const ctx = { req, me, sb: db(me?.id), params, body, ip } as unknown as C;
      const out = await handler(ctx);
      // notifications made by this change go to the phones after the reply is sent
      if (write) after(pushLater);
      if (out instanceof Response) return out;
      return NextResponse.json({ ok: true, serverTime: new Date().toISOString(), ...out }, { headers: NO_STORE });
    } catch (e) {
      const r = await toReply(e, { route, userId: me?.id, isTest: me?.isTest });
      return NextResponse.json(r.body, { status: r.status, headers: NO_STORE });
    }
  };
}

// a route for signed-in people
export const api = (opts: Opts, handler: Handler<Ctx>) => wrap<Ctx>(opts, handler);
// a route anyone may call (sign in, request access); `me` is set if they happen to be signed in
export const publicApi = (opts: Omit<Opts, "roles" | "allowMustChange">, handler: Handler<PublicCtx>) => wrap<PublicCtx>({ ...opts, public: true }, handler);

export const json = (body: object, init?: ResponseInit) => NextResponse.json({ ok: true, serverTime: new Date().toISOString(), ...body }, { ...init, headers: { ...NO_STORE, ...(init?.headers ?? {}) } });
