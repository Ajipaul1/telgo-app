import { NextResponse, type NextRequest } from "next/server";
import {
  getMobileAccessClient,
  toMobileAccessUser
} from "@/lib/server/mobile-access";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { userId?: unknown; passwordHash?: unknown; pinHash?: unknown }
    | null;
  const userId = String(body?.userId ?? "");
  const passwordHash = String(body?.passwordHash ?? "");
  const pinHash = String(body?.pinHash ?? "");

  if (!userId || passwordHash.length < 32 || pinHash.length < 32) {
    return NextResponse.json({ ok: false, message: "Verified access and PIN are required." }, { status: 400 });
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("mobile_app_users")
    .update({
      pin_hash: pinHash,
      temp_password_hash: null,
      pin_set_at: now,
      last_login_at: now,
      updated_at: now
    })
    .eq("id", userId)
    .eq("temp_password_hash", passwordHash)
    .eq("access_status", "active")
    .is("blocked_at", null)
    .select("id,email,full_name,role,login_id,user_folder_path,created_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ ok: false, message: "PIN could not be saved for this access." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, user: toMobileAccessUser(data) });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Server configuration is missing.";
}
