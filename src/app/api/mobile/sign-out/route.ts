import { NextResponse } from "next/server";
import { MOBILE_SESSION_COOKIE } from "@/lib/server/mobile-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: MOBILE_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
