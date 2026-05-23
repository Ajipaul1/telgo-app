import { NextResponse, type NextRequest } from "next/server";
import { readMobileSession } from "@/lib/server/mobile-session";
import { getMobileAccessClient } from "@/lib/server/mobile-access";

export async function GET(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const supabase = getMobileAccessClient();
  const { data, error } = await supabase
    .from("mobile_app_users")
    .select("id,email,full_name,role,login_id,access_status,created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, users: data ?? [] });
}
