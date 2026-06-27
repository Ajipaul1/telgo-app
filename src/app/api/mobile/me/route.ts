import { NextResponse, type NextRequest } from "next/server";
import { readMobileSession } from "@/lib/server/mobile-session";
import { getMobileAccessClient } from "@/lib/server/mobile-access";

export async function GET(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, user: null }, { status: 401 });
  }

  let avatarUrl = "";
  let fullName = session.fullName;
  let phone = session.phone || "";

  try {
    const supabase = getMobileAccessClient();
    const { data: user } = await supabase
      .from("mobile_app_users")
      .select("avatar_url, full_name, phone")
      .eq("id", session.userId)
      .maybeSingle();

    if (user) {
      avatarUrl = user.avatar_url || "";
      fullName = user.full_name || session.fullName;
      phone = user.phone || session.phone || "";
    }
  } catch (err) {
    console.error("Failed to fetch fresh user details in /api/mobile/me:", err);
  }

  return NextResponse.json({
    ok: true,
    user: {
      userId: session.userId,
      email: session.email,
      fullName: fullName,
      role: session.role,
      loginId: session.loginId,
      avatarUrl: avatarUrl,
      phone: phone
    }
  });
}
