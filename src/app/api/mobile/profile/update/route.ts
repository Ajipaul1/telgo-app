import { NextResponse, type NextRequest } from "next/server";
import { readMobileSession, setMobileSession } from "@/lib/server/mobile-session";
import { getMobileAccessClient, toMobileAccessUser } from "@/lib/server/mobile-access";

export async function POST(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { fullName, avatarUrl, phone } = (await request.json().catch(() => ({}))) as {
    fullName?: string;
    avatarUrl?: string;
    phone?: string;
  };

  if (!fullName || !fullName.trim()) {
    return NextResponse.json({ ok: false, message: "Full Name is required." }, { status: 400 });
  }

  const supabase = getMobileAccessClient();

  // 1. Update full_name, avatar_url, and phone in the database
  const { data: user, error: updateError } = await supabase
    .from("mobile_app_users")
    .update({
      full_name: fullName.trim(),
      avatar_url: avatarUrl || null,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.userId)
    .select()
    .single();

  if (updateError || !user) {
    return NextResponse.json(
      { ok: false, message: updateError?.message ?? "Failed to update profile database record." },
      { status: 500 }
    );
  }

  // 2. Sync to mobile_user_files profile JSON
  try {
    const { data: fileRow } = await supabase
      .from("mobile_user_files")
      .select("id, profile, folder_path")
      .eq("mobile_user_id", session.userId)
      .maybeSingle();

    if (fileRow) {
      const updatedProfile = {
        ...(fileRow.profile as Record<string, unknown> || {}),
        fullName: fullName.trim(),
        avatarUrl: avatarUrl || "",
        phone: phone || "",
      };
      await supabase
        .from("mobile_user_files")
        .update({
          profile: updatedProfile,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fileRow.id);
    }
  } catch (err) {
    console.error("Profile sync to files table failed:", err);
  }

  // 3. Re-issue session cookie with updated name
  const updatedUser = toMobileAccessUser(user);
  const response = NextResponse.json({ ok: true, user: updatedUser });
  await setMobileSession(response, updatedUser);

  return response;
}
