import { NextResponse, type NextRequest } from "next/server";
import { getMobileAccessClient } from "@/lib/server/mobile-access";
import { readMobileSession } from "@/lib/server/mobile-session";
import { markMobileAttendance } from "@/lib/server/mobile-attendance";

const MAX_ATTENDANCE_ACCURACY_M = 500;

export async function GET(request: NextRequest) {
  const session = await readMobileSession(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sign in again to view attendance." },
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

  let query = supabase
    .from("mobile_attendance")
    .select("*")
    .order("check_in_at", { ascending: false });

  if (userId) {
    query = query.eq("mobile_user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    // If the database table isn't fully created or active, fallback gracefully to empty list
    return NextResponse.json({ ok: true, records: [] });
  }

  const records = (data ?? []).map((row) => ({
    id: String(row.id ?? ""),
    mobileUserId: String(row.mobile_user_id ?? ""),
    userName: String(row.user_name ?? ""),
    userLoginId: String(row.user_login_id ?? ""),
    userRole: String(row.user_role ?? ""),
    projectId: String(row.project_id ?? ""),
    projectName: String(row.project_name ?? ""),
    checkInAt: String(row.check_in_at ?? row.created_at ?? ""),
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    gpsAccuracyM: row.gps_accuracy_m == null ? null : Number(row.gps_accuracy_m),
    distanceFromSiteM: Number(row.distance_from_site_m ?? 0),
    withinGeofence: Boolean(row.within_geofence),
    status: String(row.status ?? "checked_in"),
  }));

  return NextResponse.json({ ok: true, records });
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

  const body = (await request.json().catch(() => null)) as
    | {
        latitude?: unknown;
        longitude?: unknown;
        gpsAccuracyM?: unknown;
        projectId?: unknown;
        status?: unknown;
      }
    | null;

  const latitude = Number(body?.latitude ?? NaN);
  const longitude = Number(body?.longitude ?? NaN);
  const gpsAccuracyM =
    body?.gpsAccuracyM == null || body.gpsAccuracyM === ""
      ? null
      : Number(body.gpsAccuracyM);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json(
      { ok: false, message: "A real device location is required to mark attendance." },
      { status: 400 }
    );
  }

  if (
    gpsAccuracyM == null ||
    !Number.isFinite(gpsAccuracyM) ||
    gpsAccuracyM > MAX_ATTENDANCE_ACCURACY_M
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: `Location accuracy is too weak for live attendance tracking. Current device accuracy is about ${Math.round(
          Number.isFinite(gpsAccuracyM ?? NaN) ? gpsAccuracyM ?? 0 : 0
        )} m. Move outdoors, enable precise location, or use the phone APK and try again.`,
      },
      { status: 400 }
    );
  }

  try {
    const result = await markMobileAttendance(supabase, session, {
      latitude,
      longitude,
      gpsAccuracyM: Number.isFinite(gpsAccuracyM ?? NaN) ? gpsAccuracyM : null,
      projectId: typeof body?.projectId === "string" ? body.projectId : null,
      status: typeof body?.status === "string" ? body.status : null,
    });

    return NextResponse.json({
      ok: true,
      attendance: result.attendance,
      location: result.location,
      geofenceMeters: result.geofenceMeters,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Attendance request failed.");
  }
  return "Attendance request failed.";
}
