import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  getMobileAccessClient,
  toMobileAccessUser
} from "@/lib/server/mobile-access";
import { setMobileSession } from "@/lib/server/mobile-session";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { identifier?: unknown; password?: unknown }
    | null;

  const identifier = String(body?.identifier ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "").trim();

  if (!identifier || !password) {
    return NextResponse.json(
      { ok: false, message: "Email and password are required." },
      { status: 400 }
    );
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const { data, error } = await supabase
    .from("mobile_app_users")
    .select("id,email,full_name,role,login_id,user_folder_path,created_at,password_hash,access_status,blocked_at")
    .eq(isEmail ? "email" : "login_id", isEmail ? identifier : identifier.toUpperCase())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, message: "No account found with this email. Please request access first." },
      { status: 401 }
    );
  }

  if (data.blocked_at || data.access_status === "blocked") {
    return NextResponse.json(
      { ok: false, message: "This account is blocked. Contact Telgo operations." },
      { status: 403 }
    );
  }

  if (data.access_status === "pending") {
    return NextResponse.json(
      { ok: false, message: "Your access request is pending admin approval. You will receive an email once approved." },
      { status: 403 }
    );
  }

  const expectedHash = String(data.password_hash ?? "").trim().toLowerCase();
  const providedHash = createHash("sha256")
    .update(`${identifier}:${password}`)
    .digest("hex");

  if (!expectedHash || providedHash !== expectedHash) {
    return NextResponse.json(
      { ok: false, message: "Incorrect password. Please try again or contact Telgo admin." },
      { status: 401 }
    );
  }

  await supabase
    .from("mobile_app_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.id);

  const response = NextResponse.json({ ok: true, user: toMobileAccessUser(data) });
  setMobileSession(response, toMobileAccessUser(data));
  return response;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Server configuration is missing.";
}
