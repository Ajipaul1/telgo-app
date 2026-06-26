import { NextResponse, type NextRequest } from "next/server";
import { readMobileSession } from "@/lib/server/mobile-session";

export async function GET(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, user: null }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    user: {
      userId: session.userId,
      email: session.email,
      fullName: session.fullName,
      role: session.role,
      loginId: session.loginId,
      avatarUrl: session.avatarUrl || "",
      phone: session.phone || ""
    }
  });
}
