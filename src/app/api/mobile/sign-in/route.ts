import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  getMobileAccessClient,
  normalizeLoginId,
  toMobileAccessUser
} from "@/lib/server/mobile-access";
import { setMobileSession } from "@/lib/server/mobile-session";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { identifier?: unknown; loginId?: unknown; pinHash?: unknown; pin?: unknown }
    | null;
  const identifier = String(body?.identifier ?? body?.loginId ?? "").trim();
  const normalizedEmail = normalizeEmail(identifier);
  const loginId = normalizedEmail ? "" : normalizeLoginId(identifier);
  const pinHash = String(body?.pinHash ?? "").trim().toLowerCase();
  const pin = String(body?.pin ?? "").trim();

  if (!identifier || (pinHash.length < 32 && !/^\d{4}$/.test(pin))) {
    return NextResponse.json(
      { ok: false, message: "Telgo ID or email and a 4-digit PIN are required." },
      { status: 400 }
    );
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("mobile_app_users")
    .select("id,email,full_name,role,login_id,user_folder_path,created_at,pin_hash")
    .eq(normalizedEmail ? "email" : "login_id", normalizedEmail || loginId)
    .eq("access_status", "active")
    .is("blocked_at", null)
    .not("pin_set_at", "is", null)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const expectedPinHash = String(data?.pin_hash ?? "").trim().toLowerCase();
  const resolvedPinHash =
    pinHash.length >= 32
      ? pinHash
      : createHash("sha256")
          .update(`${normalizeLoginId(data?.login_id)}:${pin}`)
          .digest("hex");

  if (!data || !expectedPinHash || resolvedPinHash !== expectedPinHash) {
    return NextResponse.json(
      { ok: false, message: "Invalid Telgo ID/email or PIN." },
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

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
