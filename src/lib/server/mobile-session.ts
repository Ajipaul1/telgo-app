import type { NextRequest, NextResponse } from "next/server";
import type { MobileAccessUser } from "@/lib/server/mobile-access";

export const MOBILE_SESSION_COOKIE = "telgo_mobile_session";
const MOBILE_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type MobileSession = {
  userId: string;
  email: string | null;
  fullName: string;
  role: string;
  loginId: string;
  exp: number;
};

export function createMobileSession(user: MobileAccessUser): MobileSession {
  return {
    userId: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    loginId: user.login_id,
    exp: Math.floor(Date.now() / 1000) + MOBILE_SESSION_TTL_SECONDS
  };
}

export async function readMobileSession(request: NextRequest) {
  const token = request.cookies.get(MOBILE_SESSION_COOKIE)?.value ?? "";
  return await verifyMobileSessionToken(token);
}

export async function setMobileSession(response: NextResponse, user: MobileAccessUser) {
  const token = await signMobileSessionToken(createMobileSession(user));
  response.cookies.set({
    name: MOBILE_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MOBILE_SESSION_TTL_SECONDS
  });
}

export function clearMobileSession(response: NextResponse) {
  response.cookies.set({
    name: MOBILE_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0)
  });
}

function base64UrlEncode(str: string) {
  const base64 = btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string) {
  let decoded = str.replace(/-/g, '+').replace(/_/g, '/');
  while (decoded.length % 4) { decoded += '='; }
  return decodeURIComponent(atob(decoded).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

async function getCryptoKey() {
  const secret = getSessionSecret();
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function createSignature(payload: string) {
  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const uint8 = new Uint8Array(signature);
  let str = "";
  for (let i = 0; i < uint8.byteLength; i++) {
    str += String.fromCharCode(uint8[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signMobileSessionToken(session: MobileSession) {
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = await createSignature(payload);
  return `${payload}.${signature}`;
}

async function verifyMobileSessionToken(token: string): Promise<MobileSession | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  try {
    const expected = await createSignature(payload);
    if (signature !== expected) return null;
    
    const session = JSON.parse(base64UrlDecode(payload)) as MobileSession;
    if (!session?.userId || !session.loginId || !session.exp) return null;
    if (session.exp <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

function getSessionSecret() {
  return process.env.MOBILE_SESSION_SECRET ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "telgo-fallback-session-secret-hash-key-2026";
}
