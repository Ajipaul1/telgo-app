import { NextResponse, type NextRequest } from "next/server";
import { getMobileAccessClient } from "@/lib/server/mobile-access";
import { readMobileSession } from "@/lib/server/mobile-session";
import { listMobileTrackingSnapshot, markMobileAttendance } from "@/lib/server/mobile-attendance";

export async function GET(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sign in again to load live map tracking." },
      { status: 401 }
    );
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (userId) {
    try {
      const { data: historyData, error: historyError } = await supabase
        .from("mobile_live_locations")
        .select("latitude,longitude,recorded_at")
        .eq("mobile_user_id", userId)
        .order("recorded_at", { ascending: true })
        .limit(150);

      if (historyError) {
        return NextResponse.json({ ok: false, message: historyError.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, history: historyData ?? [] });
    } catch (error) {
      return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
    }
  }

  try {
    const snapshot = await listMobileTrackingSnapshot(supabase, session);
    
    // Fetch all active operational crew members from database
    const { data: crewData } = await supabase
      .from("mobile_app_users")
      .select("id,email,full_name,role,login_id")
      .in("role", ["supervisor", "finance"])
      .eq("access_status", "active")
      .is("blocked_at", null);

    const crew = (crewData ?? []).map(row => ({
      userId: row.id,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      loginId: row.login_id
    }));

    return NextResponse.json({ ok: true, ...snapshot, crew });
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sign in again to mark attendance." },
      { status: 401 }
    );
  }

  let supabase: ReturnType<typeof getMobileAccessClient>;
  try {
    supabase = getMobileAccessClient();
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }

  try {
    const body = await request.json();
    const result = await markMobileAttendance(supabase, session, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Live map request failed.");
  }
  return "Live map request failed.";
}
