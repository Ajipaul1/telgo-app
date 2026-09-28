import { NextResponse } from "next/server";

// which version is live: the phone compares it with the one it is running and offers the new one
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json(
    { ok: true, version: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev", serverTime: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
