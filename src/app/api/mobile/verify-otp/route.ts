import { NextResponse, type NextRequest } from "next/server";
import {
  getMobileAccessClient,
  toMobileAccessUser
} from "@/lib/server/mobile-access";

export async function POST(request: NextRequest) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, message: "A verified email session is required." },
      { status: 401 }
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

  const { data, error } = await supabase
    .from("mobile_app_users")
    .select("id,email,full_name,role,login_id,user_folder_path,created_at,auth_user_id")
    .eq("email", email)
    .eq("access_status", "active")
    .is("blocked_at", null)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      {
        ok: false,
        message: "No active Telgo mobile access is linked to this email address."
      },
      { status: 403 }
    );
  }

  const existingAuthUserId =
    data.auth_user_id == null ? null : String(data.auth_user_id).trim();

  if (existingAuthUserId && existingAuthUserId !== authUser.id) {
    return NextResponse.json(
      {
        ok: false,
        message: "This email is already linked to another Telgo mobile session."
      },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("mobile_app_users")
    .update({
      auth_user_id: authUser.id,
      activated_at: now,
      updated_at: now
    })
    .eq("id", data.id);

  if (updateError) {
    return NextResponse.json({ ok: false, message: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user: toMobileAccessUser(data) });
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
