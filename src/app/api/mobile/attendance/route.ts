import { NextResponse, type NextRequest } from "next/server";
import { getMobileAccessClient } from "@/lib/server/mobile-access";
import { readMobileSession } from "@/lib/server/mobile-session";
import { markMobileAttendance } from "@/lib/server/mobile-attendance";

const MAX_ATTENDANCE_ACCURACY_M = 500;

export async function POST(request: NextRequest) {
  const session = readMobileSession(request);
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
        )} m. Move outdoors, enable precise location, or use the phone APK and try again.`
      },
      { status: 400 }
    );
  }

  try {
    const result = await markMobileAttendance(supabase, session, {
      latitude,
      longitude,
      gpsAccuracyM: Number.isFinite(gpsAccuracyM ?? NaN) ? gpsAccuracyM : null,
      projectId: typeof body?.projectId === "string" ? body.projectId : null
    });

    return NextResponse.json({
      ok: true,
      attendance: result.attendance,
      location: result.location,
      geofenceMeters: result.geofenceMeters
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
