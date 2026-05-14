import { createHmac, timingSafeEqual } from "node:crypto";
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

export function readMobileSession(request: NextRequest) {
  const token = request.cookies.get(MOBILE_SESSION_COOKIE)?.value ?? "";
  return verifyMobileSessionToken(token);
}

export function setMobileSession(response: NextResponse, user: MobileAccessUser) {
  const token = signMobileSessionToken(createMobileSession(user));
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
    maxAge: 0
  });
}

function signMobileSessionToken(session: MobileSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createSignature(payload);
  return `${payload}.${signature}`;
}

function verifyMobileSessionToken(token: string): MobileSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = createSignature(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as MobileSession;
    if (!session?.userId || !session.loginId || !session.exp) return null;
    if (session.exp <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

function createSignature(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function getSessionSecret() {
  const secret =
    process.env.MOBILE_SESSION_SECRET ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Mobile session secret is not configured.");
  }

  return secret;
}
