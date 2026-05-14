import { NextResponse, type NextRequest } from "next/server";
import { clearMobileSession } from "@/lib/server/mobile-session";

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  clearMobileSession(response);
  return response;
}
