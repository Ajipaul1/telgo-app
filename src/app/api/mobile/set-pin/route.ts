import { NextResponse, type NextRequest } from "next/server";
import {
  getMobileAccessClient,
  toMobileAccessUser
} from "@/lib/server/mobile-access";
import { setMobileSession } from "@/lib/server/mobile-session";

export async function POST(request: NextRequest) {
  const accessToken = getBearerToken(request);
  const body = (await request.json().catch(() => null)) as
    | { userId?: unknown; pinHash?: unknown }
    | null;
  const userId = String(body?.userId ?? "");
  const pinHash = String(body?.pinHash ?? "");

  if (!accessToken) {
    return NextResponse.json(
      { ok: false, message: "A verified email session is required." },
      { status: 401 }
    );
  }

  if (!userId || pinHash.length < 32) {
    return NextResponse.json(
      { ok: false, message: "Verified access and PIN are required." },
      { status: 400 }
    );
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: getErrorMessage(error) },
      { status: 500 }
    );
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  const authUser = authData.user;
  const email = String(authUser?.email ?? "").trim().toLowerCase();

  if (authError || !authUser || !email) {
    return NextResponse.json(
      { ok: false, message: authError?.message ?? "The email session is not valid." },
      { status: 401 }
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("mobile_app_users")
    .update({
      pin_hash: pinHash,
      temp_password_hash: null,
      auth_user_id: authUser.id,
      pin_set_at: now,
      last_login_at: now,
      updated_at: now
    })
    .eq("id", userId)
    .eq("email", email)
    .eq("access_status", "active")
    .is("blocked_at", null)
    .select("id,email,full_name,role,login_id,user_folder_path,created_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, message: "PIN could not be saved for this access." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true, user: toMobileAccessUser(data) });
  setMobileSession(response, toMobileAccessUser(data));
  return response;
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return "";
  return token.trim();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Server configuration is missing.";
}
