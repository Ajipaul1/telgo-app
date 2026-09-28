import { NextResponse, type NextRequest } from "next/server";
import { readMobileSession } from "@/lib/server/mobile-session";
import { getMobileAccessClient } from "@/lib/server/mobile-access";

export async function POST(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const { userId, fullName, email, role, accessStatus } = (await request.json().catch(() => ({}))) as {
    userId?: string;
    fullName?: string;
    email?: string;
    role?: string;
    accessStatus?: string;
  };

  if (!userId) {
    return NextResponse.json({ ok: false, message: "User ID is required." }, { status: 400 });
  }

  const supabase = getMobileAccessClient();

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (fullName !== undefined) payload.full_name = fullName.trim();
  if (email !== undefined) payload.email = email.trim().toLowerCase();
  if (role !== undefined) payload.role = role.trim().toLowerCase();
  
  if (accessStatus !== undefined) {
    payload.access_status = accessStatus;
    if (accessStatus === "blocked") {
      payload.blocked_at = new Date().toISOString();
      payload.blocked_reason = "Blocked by administrator from the control panel.";
    } else {
      payload.blocked_at = null;
      payload.blocked_reason = null;
    }
  }

  const { data, error } = await supabase
    .from("mobile_app_users")
    .update(payload)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  // Also sync profile in mobile_user_files if it exists
  try {
    const { data: fileRow } = await supabase
      .from("mobile_user_files")
      .select("id, profile")
      .eq("mobile_user_id", userId)
      .maybeSingle();

    if (fileRow) {
      const updatedProfile = {
        ...(fileRow.profile as Record<string, unknown> || {}),
        fullName: fullName !== undefined ? fullName.trim() : (fileRow.profile as Record<string, unknown>)?.fullName,
        email: email !== undefined ? email.trim().toLowerCase() : (fileRow.profile as Record<string, unknown>)?.email,
        role: role !== undefined ? role.trim().toLowerCase() : (fileRow.profile as Record<string, unknown>)?.role,
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
    console.error("Admin user sync to files table failed:", err);
  }

  return NextResponse.json({ ok: true, user: data });
}
