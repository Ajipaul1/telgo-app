import { NextResponse, type NextRequest } from "next/server";
import {
  getMobileAccessClient,
  normalizeLoginId,
  toMobileAccessUser
} from "@/lib/server/mobile-access";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { loginId?: unknown; passwordHash?: unknown }
    | null;
  const loginId = normalizeLoginId(body?.loginId);
  const passwordHash = String(body?.passwordHash ?? "");

  if (!loginId || passwordHash.length < 32) {
    return NextResponse.json({ ok: false, message: "Telgo ID and password are required." }, { status: 400 });
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("mobile_app_users")
    .select("id,email,full_name,role,login_id,user_folder_path,created_at")
    .eq("login_id", loginId)
    .eq("temp_password_hash", passwordHash)
    .eq("access_status", "active")
    .is("blocked_at", null)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ ok: false, message: "Invalid Telgo ID or password." }, { status: 401 });
  }

  await supabase
    .from("mobile_app_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.id);

  return NextResponse.json({ ok: true, user: toMobileAccessUser(data) });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Server configuration is missing.";
}
