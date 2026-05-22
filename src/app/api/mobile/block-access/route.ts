import { NextResponse, type NextRequest } from "next/server";
import { readMobileSession } from "@/lib/server/mobile-session";
import { getMobileAccessClient } from "@/lib/server/mobile-access";

export async function POST(request: NextRequest) {
  const session = readMobileSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const { userId } = await request.json().catch(() => ({})) as { userId?: string };
  if (!userId) return NextResponse.json({ ok: false, message: "User ID required" }, { status: 400 });
  const supabase = getMobileAccessClient();
  const { error } = await supabase
    .from("mobile_app_users")
    .update({ access_status: "blocked", blocked_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
